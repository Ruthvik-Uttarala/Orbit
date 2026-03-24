// ============================================================
// Orbit DevOps - Deploy Routes
// API endpoints for deployment operations
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DeployRequest, DeployResponse, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';
import { deploymentTracker } from '../services/deployment-tracker';

export const deployRouter = Router();

// Deploy endpoint - triggers deployment flow
deployRouter.post('/', async (req: Request, res: Response) => {
  const { environment, version, branch, parameters } = req.body as DeployRequest;
  
  const deploymentId = uuidv4();
  deploymentTracker.initializeDeployment(deploymentId);
  
  console.log(`[Deploy] Deployment requested: ${deploymentId}`, {
    environment,
    version,
    branch,
    parameters
  });
  
  // Start deployment asynchronously
  flowOrchestrator.executeFlow(deploymentId, 'deploy-flow', {
    environment: environment || 'staging',
    version: version || 'latest',
    branch: branch || 'main',
    ...parameters
  }).then(result => {
    console.log(`[Deploy] Deployment ${deploymentId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  }).catch(error => {
    console.error(`[Deploy] Deployment ${deploymentId} error:`, error);
  });
  
  const response: DeployResponse = {
    executionId: deploymentId,
    status: FlowStatus.PENDING,
    message: `Deployment to ${environment || 'staging'} initiated`,
    timestamp: new Date().toISOString()
  };
  
  res.status(202).json({
    ...response,
    deploymentId
  });
});

// Get deployment status
deployRouter.get('/status/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const execution = await flowOrchestrator.getExecution(id);

  const deploymentStatus = deploymentTracker.getDeploymentStatus(id, execution);

  if (!execution || !deploymentStatus) {
    res.status(404).json({ error: 'Deployment not found' });
    return;
  }

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
    result: deploymentStatus.result
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
