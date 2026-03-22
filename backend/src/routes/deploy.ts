// ============================================================
// Orbit DevOps - Deploy Routes
// API endpoints for deployment operations
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DeployRequest, DeployResponse, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';

export const deployRouter = Router();

// Deploy endpoint - triggers deployment flow
deployRouter.post('/', async (req: Request, res: Response) => {
  const { environment, version, branch, parameters } = req.body as DeployRequest;
  
  const executionId = uuidv4();
  
  console.log(`[Deploy] Deployment requested: ${executionId}`, {
    environment,
    version,
    branch,
    parameters
  });
  
  // Start deployment asynchronously
  flowOrchestrator.executeFlow(executionId, 'deploy-flow', {
    environment: environment || 'staging',
    version: version || 'latest',
    branch: branch || 'main',
    ...parameters
  }).then(result => {
    console.log(`[Deploy] Deployment ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    console.error(`[Deploy] Deployment ${executionId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId,
    status: FlowStatus.PENDING,
    message: `Deployment to ${environment || 'staging'} initiated`,
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json(response);
});

// Get deployment status
deployRouter.get('/status/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const execution = await flowOrchestrator.getExecution(id);
  
  if (!execution) {
    res.status(404).json({ error: 'Deployment not found' });
    return;
  }
  
  const displayLogs = execution.logs.map(log => {
    if (typeof log === 'string') return log;
    return log.message;
  });
  
  res.json({
    executionId: id,
    status: execution.status,
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

// Cancel deployment
deployRouter.post('/cancel/:id', async (req: Request, res: Response) => {
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
});
