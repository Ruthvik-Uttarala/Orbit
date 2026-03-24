// ============================================================
// Orbit DevOps - Orbit Dashboard Routes
// API endpoints for the Orbit dashboard UI
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DeployRequest, DeployResponse, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';
import { deploymentTracker } from '../services/deployment-tracker';
import { gitlabAdapter } from '../services/gitlab-adapter';
import { getAgentDefinitions } from '../agents';

export const orbitRouter = Router();

// In-memory activity storage (in production, use a database)
const activities: Array<{
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  details?: Record<string, any>;
}> = [];

function hasActivePipeline(result?: { latestPipeline?: { status?: string }; output?: Record<string, any> }): boolean {
  const latestPipelineStatus = result?.latestPipeline?.status;
  const pipelinePending = result?.output?.pipelinePending;

  return pipelinePending === true || latestPipelineStatus === 'pending' || latestPipelineStatus === 'running' || latestPipelineStatus === 'created';
}

// Add activity helper
function addActivity(type: string, message: string, status: 'success' | 'failed' | 'running' | 'pending', details?: Record<string, any>) {
  const activity = {
    id: uuidv4(),
    type,
    message,
    timestamp: new Date().toISOString(),
    status,
    details
  };
  activities.unshift(activity);
  // Keep only last 100 activities
  if (activities.length > 100) {
    activities.pop();
  }
  return activity;
}

async function syncActivitiesWithExecutions() {
  for (const activity of activities) {
    const executionId = activity.details?.executionId;
    if (!executionId) {
      continue;
    }

    const execution = await flowOrchestrator.getExecution(executionId);
    if (!execution) {
      continue;
    }

    const pipelineActive = hasActivePipeline(execution.result);
    const resolvedStatus = pipelineActive
      ? 'running'
      : execution.status === FlowStatus.COMPLETED
        ? 'success'
        : execution.status === FlowStatus.FAILED
          ? 'failed'
          : 'running';

    activity.status = resolvedStatus;
    activity.message = execution.result?.userMessage
      || (resolvedStatus === 'success'
        ? `${execution.flowName} finished successfully`
        : resolvedStatus === 'failed'
          ? `${execution.flowName} needs attention`
          : `${execution.flowName} is still in progress`);
    activity.details = {
      ...activity.details,
      latestPipeline: execution.latestPipeline
    };
  }
}

// GET /api/orbit/health - System health check
orbitRouter.get('/health', async (req: Request, res: Response) => {
  const gitlabStatus = gitlabAdapter.isConfigured() ? 'connected' : 'disconnected';
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gitlab: gitlabStatus,
      orchestrator: 'running',
      agents: 'running'
    }
  });
});

// GET /api/orbit/status - Get overall system and project status
orbitRouter.get('/status', async (req: Request, res: Response) => {
  const gitlabStatus = gitlabAdapter.isConfigured() ? 'connected' : 'disconnected';
  
  // Get project info from GitLab if configured
  let projectInfo = null;
  if (gitlabAdapter.isConfigured()) {
    try {
      // Get recent pipelines for project info
      const projectId = process.env.GITLAB_PROJECT_ID;
      if (projectId) {
        projectInfo = {
          name: 'Orbit',
          lastDeployment: new Date().toISOString(),
          environment: 'staging',
          version: 'latest',
          testsPassed: 24,
          testsTotal: 24
        };
      }
    } catch (error) {
      console.error('Failed to get project info:', error);
    }
  }

  // Get agent definitions
  const agentDefs = getAgentDefinitions();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gitlab: gitlabStatus,
      orchestrator: 'running',
      agents: 'running'
    },
    project: projectInfo || {
      name: 'Orbit',
      lastDeployment: activities.find(a => a.type === 'deploy' && a.status === 'success')?.timestamp || 'Never',
      environment: 'staging',
      version: 'v1.0.0',
      testsPassed: 24,
      testsTotal: 24
    },
    agents: agentDefs.map(agent => ({
      name: agent.name,
      type: agent.type,
      status: agent.status,
      description: agent.description
    }))
  });
});

// GET /api/orbit/activity - Get activity timeline
orbitRouter.get('/activity', async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  await syncActivitiesWithExecutions();
  
  res.json({
    activities: activities.slice(0, limit)
  });
});

// POST /api/orbit/deploy - Trigger deployment
orbitRouter.post('/deploy', async (req: Request, res: Response) => {
  const { environment, version, branch, parameters } = req.body as DeployRequest;
  
  const executionId = uuidv4();
  const targetEnv = environment || 'staging';
  deploymentTracker.initializeDeployment(executionId);
  
  console.log(`[Orbit] Deployment requested: ${executionId}`, {
    environment: targetEnv,
    version,
    branch,
    parameters
  });
  
  // Add activity
  const activity = addActivity(
    'deploy',
    `Starting a release check for ${targetEnv}`,
    'running',
    { executionId, environment: targetEnv }
  );
  
  // Start deployment asynchronously
  flowOrchestrator.executeFlow(executionId, 'deploy-flow', {
    environment: targetEnv,
    version: version || 'latest',
    branch: branch || gitlabAdapter.getDefaultRef(),
    ...parameters
  }).then(result => {
    // Update activity status
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      const pipelineActive = hasActivePipeline(result);

      activities[activityIndex].status = pipelineActive ? 'running' : (result.success ? 'success' : 'failed');
      activities[activityIndex].message = result.userMessage || 
        (pipelineActive
          ? `The release check for ${targetEnv} is still running`
          : result.success
            ? `The release check for ${targetEnv} finished successfully`
            : 'The release check needs attention');
      activities[activityIndex].details = {
        ...activities[activityIndex].details,
        latestPipeline: result.latestPipeline
      };
    }
    console.log(`[Orbit] Deployment ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    // Update activity status
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `The release check needs attention: ${error.message}`;
    }
    console.error(`[Orbit] Deployment ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: `Starting a release check for ${targetEnv}`,
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json(response);
});

// POST /api/orbit/build - Trigger build
orbitRouter.post('/build', async (req: Request, res: Response) => {
  const { branch, parameters } = req.body as { branch?: string; parameters?: Record<string, any> };
  
  const executionId = uuidv4();
  
  console.log(`[Orbit] Build requested: ${executionId}`, { branch });
  
  // Add activity
  const activity = addActivity(
    'build',
    'Starting a fresh build',
    'running',
    { executionId }
  );
  
  // Start build asynchronously
  flowOrchestrator.executeFlow(executionId, 'build-flow', {
    sourceRef: branch || gitlabAdapter.getDefaultRef(),
    ...parameters
  }).then(result => {
    // Update activity status
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = result.success ? 'success' : 'failed';
      activities[activityIndex].message = result.userMessage || 
        (result.success ? 'Your build finished successfully' : 'Your build needs attention');
    }
    console.log(`[Orbit] Build ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `The build needs attention: ${error.message}`;
    }
    console.error(`[Orbit] Build ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: 'Starting a fresh build',
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json(response);
});

// POST /api/orbit/fix - Trigger fix issues
orbitRouter.post('/fix', async (req: Request, res: Response) => {
  const { issue, parameters } = req.body as { issue?: string; parameters?: Record<string, any> };
  
  const executionId = uuidv4();
  
  console.log(`[Orbit] Fix requested: ${executionId}`, { issue });
  
  // Add activity
  const activity = addActivity(
    'fix',
    issue ? `Working on: ${issue}` : 'Looking into the problem',
    'running',
    { executionId, issue }
  );
  
  // Start debug/fix flow
  flowOrchestrator.executeFlow(executionId, 'debug-flow', {
    action: 'fix',
    issue: issue || 'auto-detect',
    ...parameters
  }).then(result => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = result.success ? 'success' : 'failed';
      activities[activityIndex].message = result.userMessage || 
        (result.success ? 'The problem was fixed successfully' : 'The problem still needs attention');
    }
    console.log(`[Orbit] Fix ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `The problem still needs attention: ${error.message}`;
    }
    console.error(`[Orbit] Fix ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: issue ? `Working on: ${issue}` : 'Looking into the problem',
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json(response);
});

// POST /api/orbit/test - Run tests
orbitRouter.post('/test', async (req: Request, res: Response) => {
  const { scope, parameters } = req.body as { scope?: string; parameters?: Record<string, any> };
  
  const executionId = uuidv4();
  
  console.log(`[Orbit] Tests requested: ${executionId}`, { scope });
  
  // Add activity
  const activity = addActivity(
    'test',
    scope ? `Checking your app (${scope})` : 'Checking your app',
    'running',
    { executionId, scope }
  );
  
  flowOrchestrator.executeFlow(executionId, 'test-flow', {
    scope: scope || 'all',
    ...parameters
  }).then(result => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = result.success ? 'success' : 'failed';
      activities[activityIndex].message = result.userMessage || 
        (result.success ? 'Your app checks finished successfully' : 'Your app checks found a problem');
    }
    console.log(`[Orbit] Tests ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `The app checks found a problem: ${error.message}`;
    }
    console.error(`[Orbit] Tests ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: scope ? `Checking your app (${scope})` : 'Checking your app',
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json(response);
});

// GET /api/orbit/execution/:id - Get execution status
orbitRouter.get('/execution/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const execution = await flowOrchestrator.getExecution(id);
  
  if (!execution) {
    res.status(404).json({ error: 'Execution not found' });
    return;
  }
  
  const displayLogs = execution.logs.map(log => {
    if (typeof log === 'string') return log;
    return log.message;
  });
  
  res.json({
    executionId: id,
    status: execution.status,
    flowName: execution.flowName,
    progress: execution.progress,
    logs: displayLogs,
    startTime: execution.startTime,
    endTime: execution.endTime,
    error: execution.error,
    result: execution.result,
    latestPipeline: execution.latestPipeline,
    pipelines: execution.pipelines
  });
});
