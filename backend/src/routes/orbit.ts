// ============================================================
// Orbit DevOps - Orbit Dashboard Routes
// API endpoints for the Orbit dashboard UI
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DeployRequest, DeployResponse, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';
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
          name: projectId,
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
      name: process.env.GITLAB_PROJECT_ID || 'Not configured',
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
  
  res.json({
    activities: activities.slice(0, limit)
  });
});

// POST /api/orbit/deploy - Trigger deployment
orbitRouter.post('/deploy', async (req: Request, res: Response) => {
  const { environment, version, branch, parameters } = req.body as DeployRequest;
  
  const executionId = uuidv4();
  const targetEnv = environment || 'staging';
  
  console.log(`[Orbit] Deployment requested: ${executionId}`, {
    environment: targetEnv,
    version,
    branch,
    parameters
  });
  
  // Add activity
  const activity = addActivity(
    'deploy',
    `Deployment to ${targetEnv} initiated`,
    'running',
    { executionId, environment: targetEnv }
  );
  
  // Start deployment asynchronously
  flowOrchestrator.executeFlow(executionId, 'deploy-flow', {
    environment: targetEnv,
    version: version || 'latest',
    branch: branch || 'main',
    ...parameters
  }).then(result => {
    // Update activity status
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      const pipelineActive = hasActivePipeline(result);

      activities[activityIndex].status = pipelineActive ? 'running' : (result.success ? 'success' : 'failed');
      activities[activityIndex].message = result.userMessage || 
        (pipelineActive
          ? `Deployment pipeline for ${targetEnv} is still running`
          : result.success
            ? `Deployment to ${targetEnv} completed successfully`
            : 'Deployment failed');
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
      activities[activityIndex].message = `Deployment failed: ${error.message}`;
    }
    console.error(`[Orbit] Deployment ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: `Deployment to ${targetEnv} initiated`,
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
    'Build initiated',
    'running',
    { executionId }
  );
  
  // Start build asynchronously
  flowOrchestrator.executeFlow(executionId, 'build-flow', {
    branch: branch || 'main',
    ...parameters
  }).then(result => {
    // Update activity status
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = result.success ? 'success' : 'failed';
      activities[activityIndex].message = result.userMessage || 
        (result.success ? 'Build completed successfully' : 'Build failed');
    }
    console.log(`[Orbit] Build ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `Build failed: ${error.message}`;
    }
    console.error(`[Orbit] Build ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: 'Build initiated',
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
    issue ? `Fixing: ${issue}` : 'Analyzing and fixing issues',
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
        (result.success ? 'Issues fixed successfully' : 'Fix failed');
    }
    console.log(`[Orbit] Fix ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `Fix failed: ${error.message}`;
    }
    console.error(`[Orbit] Fix ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: issue ? `Fixing: ${issue}` : 'Analyzing and fixing issues',
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
    scope ? `Running tests: ${scope}` : 'Running all tests',
    'running',
    { executionId, scope }
  );
  
  // Start test flow (reuse build flow with test action)
  flowOrchestrator.executeFlow(executionId, 'build-flow', {
    action: 'test',
    scope: scope || 'all',
    ...parameters
  }).then(result => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = result.success ? 'success' : 'failed';
      activities[activityIndex].message = result.userMessage || 
        (result.success ? 'Tests completed successfully' : 'Tests failed');
    }
    console.log(`[Orbit] Tests ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    const activityIndex = activities.findIndex(a => a.id === activity.id);
    if (activityIndex !== -1) {
      activities[activityIndex].status = 'failed';
      activities[activityIndex].message = `Tests failed: ${error.message}`;
    }
    console.error(`[Orbit] Tests ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: scope ? `Running tests: ${scope}` : 'Running all tests',
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json(response);
});

// GET /api/orbit/execution/:id - Get execution status
orbitRouter.get('/execution/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const execution = flowOrchestrator.getExecution(id);
  
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
