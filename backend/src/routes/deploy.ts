// ============================================================
// Orbit DevOps - Deploy Routes
// API endpoints for deployment operations
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DeployRequest, DeployResponse, FlowExecution, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';
import { deploymentTracker } from '../services/deployment-tracker';
import {
  DeploymentRow,
  getDeploymentsForUser,
  saveDeploymentRecord,
  verifySupabaseJwt
} from '../services/supabase';
import { gitlabAdapter } from '../services/gitlab-adapter';

export const deployRouter = Router();
const deploymentOwners = new Map<string, { userId: string; saved: boolean }>();
const deploymentSaveLocks = new Set<string>();

function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader) return undefined;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return undefined;
  return token;
}

async function authenticateRequest(req: Request): Promise<{ id: string; email?: string }> {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error('Missing Authorization bearer token.');
  }

  return verifySupabaseJwt(token);
}

async function waitForDeploymentCompletion(
  deploymentId: string,
  timeoutMs: number,
  pollIntervalMs = 1000
): Promise<FlowExecution> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const execution = await flowOrchestrator.getExecution(deploymentId);

    if (execution && (execution.status === FlowStatus.COMPLETED || execution.status === FlowStatus.FAILED)) {
      return execution;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Timed out waiting for deployment completion.');
}

function extractDeploymentUrl(execution: FlowExecution): string | undefined {
  const output = execution.result?.output || {};
  const explicitUrl = typeof output.url === 'string' ? output.url : undefined;

  if (explicitUrl) {
    return explicitUrl;
  }

  return process.env.VERCEL_DEPLOYMENT_URL || undefined;
}

function extractVercelUrlFromText(text: string): string | undefined {
  const match = text.match(/https?:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.vercel\.app(?:\/[^\s"'`<>]*)?/i);
  return match?.[0];
}

async function extractVercelUrlFromPipeline(execution: FlowExecution): Promise<string | undefined> {
  const pipelineId = execution.latestPipeline?.id;
  if (!pipelineId) {
    return undefined;
  }

  try {
    const jobs = await gitlabAdapter.getPipelineJobs(pipelineId);
    const orderedJobs = [...jobs].sort((a, b) => (b.id || 0) - (a.id || 0));

    for (const job of orderedJobs) {
      if (!job?.id) {
        continue;
      }

      const logs = await gitlabAdapter.getJobLogs(job.id);
      const extractedUrl = extractVercelUrlFromText(logs);
      if (extractedUrl) {
        return extractedUrl;
      }
    }
  } catch (error) {
    console.warn(`[Deploy] Unable to extract Vercel URL from pipeline logs: ${(error as Error).message}`);
  }

  return undefined;
}

async function resolveDeploymentUrl(execution: FlowExecution): Promise<string | undefined> {
  const directUrl = extractDeploymentUrl(execution);
  if (directUrl) {
    return directUrl;
  }

  return extractVercelUrlFromPipeline(execution);
}

function isTerminalExecution(execution: FlowExecution): boolean {
  return execution.status === FlowStatus.COMPLETED || execution.status === FlowStatus.FAILED;
}

async function persistDeploymentIfNeeded(
  deploymentId: string,
  userId: string,
  execution: FlowExecution
): Promise<DeploymentRow | undefined> {
  const owner = deploymentOwners.get(deploymentId);
  if (!owner || owner.userId !== userId || owner.saved || !isTerminalExecution(execution)) {
    return undefined;
  }

  if (deploymentSaveLocks.has(deploymentId)) {
    return undefined;
  }

  deploymentSaveLocks.add(deploymentId);
  try {
    const deploymentUrl = await resolveDeploymentUrl(execution);
    const saved = await saveDeploymentRecord({
      userId,
      url: deploymentUrl,
      status: execution.status === FlowStatus.COMPLETED ? 'success' : 'failed'
    });
    deploymentOwners.set(deploymentId, { userId, saved: true });
    return saved;
  } finally {
    deploymentSaveLocks.delete(deploymentId);
  }
}

// Deploy endpoint
deployRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { environment, version, branch, parameters, waitForCompletion } = req.body as DeployRequest & {
      waitForCompletion?: boolean;
    };

    const deploymentId = uuidv4();
    const targetEnvironment = environment || 'staging';
    const shouldWaitForCompletion = waitForCompletion !== false;
    deploymentOwners.set(deploymentId, { userId: user.id, saved: false });

    deploymentTracker.initializeDeployment(deploymentId);

    console.log(`[Deploy] Deployment requested: ${deploymentId}`, {
      userId: user.id,
      environment: targetEnvironment,
      version,
      branch,
      shouldWaitForCompletion,
      parameters
    });

    flowOrchestrator.executeFlow(deploymentId, 'deploy-flow', {
      environment: targetEnvironment,
      version: version || 'latest',
      branch: branch || 'main',
      ...parameters
    }).then(result => {
      console.log(`[Deploy] Deployment ${deploymentId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
    }).catch(error => {
      console.error(`[Deploy] Deployment ${deploymentId} error:`, error);
    });

    if (!shouldWaitForCompletion) {
      const response: DeployResponse = {
        executionId: deploymentId,
        status: FlowStatus.PENDING,
        message: `Deployment to ${targetEnvironment} initiated`,
        timestamp: new Date().toISOString()
      };

      res.status(202).json({
        ...response,
        deploymentId
      });
      return;
    }

    const timeoutMs = Number(process.env.DEPLOY_WAIT_TIMEOUT_MS || 15 * 60 * 1000);
    const terminalExecution = await waitForDeploymentCompletion(deploymentId, timeoutMs);
    const deploymentUrl = await resolveDeploymentUrl(terminalExecution);
    const status = terminalExecution.status === FlowStatus.COMPLETED ? 'success' : 'failed';
    const savedDeployment = await saveDeploymentRecord({
      userId: user.id,
      url: deploymentUrl,
      status
    });
    deploymentOwners.set(deploymentId, { userId: user.id, saved: true });

    if (terminalExecution.status !== FlowStatus.COMPLETED) {
      res.status(502).json({
        deploymentId,
        status: 'failed',
        error: terminalExecution.error || terminalExecution.result?.message || 'Deployment failed',
        result: terminalExecution.result,
        savedDeployment
      });
      return;
    }

    res.json({
      deploymentId,
      status: 'success',
      url: deploymentUrl,
      message: terminalExecution.result?.userMessage || `Deployment to ${targetEnvironment} succeeded`,
      savedDeployment
    });
  } catch (error) {
    const message = (error as Error).message || 'Deployment request failed';
    const statusCode = message.includes('Authorization') || message.includes('token') ? 401 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// Get deployment status
deployRouter.get('/status/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { id } = req.params;
    const owner = deploymentOwners.get(id);
    if (owner && owner.userId !== user.id) {
      res.status(403).json({ error: 'You are not allowed to access this deployment.' });
      return;
    }
    
    const execution = await flowOrchestrator.getExecution(id);
    const deploymentStatus = deploymentTracker.getDeploymentStatus(id, execution);
  
    if (!execution || !deploymentStatus) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    const savedDeployment = await persistDeploymentIfNeeded(id, user.id, execution);
  
    res.json({
      deploymentId: id,
      status: deploymentStatus.status,
      progress: deploymentStatus.progress,
      steps: deploymentStatus.steps.map(step => ({
        name: step.name,
        status: step.status,
        message: step.message,
        timestamp: step.timestamp
      })),
      result: deploymentStatus.result,
      savedDeployment
    });
  } catch (error) {
    const message = (error as Error).message || 'Unable to fetch deployment status';
    const statusCode = message.includes('Authorization') || message.includes('token') ? 401 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// Get deployment history for the authenticated user
deployRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const deployments = await getDeploymentsForUser(user.id);
    res.json({ deployments });
  } catch (error) {
    const message = (error as Error).message || 'Unable to load deployment history';
    const statusCode = message.includes('Authorization') || message.includes('token') ? 401 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// Cancel deployment
deployRouter.post('/cancel/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req);
    const { id } = req.params;
    
    const execution = await flowOrchestrator.getExecution(id);
    
    if (!execution) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }
    
    // In a real implementation, we'd cancel the pipeline
    res.json({
      message: 'Deployment cancellation requested',
      executionId: id
    });
  } catch (error) {
    const message = (error as Error).message || 'Unable to cancel deployment';
    const statusCode = message.includes('Authorization') || message.includes('token') ? 401 : 500;
    res.status(statusCode).json({ error: message });
  }
});
