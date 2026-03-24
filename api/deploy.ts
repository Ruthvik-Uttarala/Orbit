// ============================================================
// Orbit DevOps - Deploy Endpoint (Vercel Serverless)
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

// Import orchestrator and types - using require for serverless compatibility
const orchestratorModule = require('../backend/src/services/orchestrator');
const types = require('../backend/src/services/types');
const trackerModule = require('../backend/src/services/deployment-tracker');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // POST /api/deploy - Trigger deployment
  if (method === 'POST') {
    const { environment, version, branch, parameters } = req.body;
    
    const executionId = uuidv4();
    trackerModule.deploymentTracker.initializeDeployment(executionId);
    
    console.log(`[Deploy] Deployment requested: ${executionId}`, {
      environment,
      version,
      branch,
      parameters
    });
    
    // Start deployment asynchronously
    orchestratorModule.flowOrchestrator.executeFlow(executionId, 'deploy-flow', {
      environment: environment || 'staging',
      version: version || 'latest',
      branch: branch || 'main',
      ...parameters
    }).then((result: any) => {
      console.log(`[Deploy] Deployment ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
    }).catch((error: any) => {
      console.error(`[Deploy] Deployment ${executionId} error:`, error);
    });
    
    const response = {
      executionId,
      status: types.FlowStatus.PENDING,
      message: `Deployment to ${environment || 'staging'} initiated`,
      timestamp: new Date().toISOString()
    };
    
    res.status(202).json({
      ...response,
      deploymentId: executionId
    });
  } 
  // GET /api/deploy/status/:id - Get deployment status
  else if (method === 'GET') {
    const pathParts = req.url?.split('/') || [];
    const statusIndex = pathParts.indexOf('status');
    
    if (statusIndex !== -1 && pathParts[statusIndex + 1]) {
      const executionId = pathParts[statusIndex + 1];
      
      const execution = await orchestratorModule.flowOrchestrator.getExecution(executionId);
      const deploymentStatus = trackerModule.deploymentTracker.getDeploymentStatus(executionId, execution);
      
      if (!execution || !deploymentStatus) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      res.json({
        deploymentId: executionId,
        status: deploymentStatus.status,
        progress: deploymentStatus.progress,
        steps: deploymentStatus.steps.map((step: any) => ({
          name: step.name,
          status: step.status,
          message: step.message,
          timestamp: step.timestamp
        })),
        result: deploymentStatus.result
      });
    } else {
      res.status(400).json({ error: 'Missing deployment ID' });
    }
  } 
  // POST /api/deploy/cancel/:id - Cancel deployment
  else if (method === 'POST' && req.url?.includes('cancel')) {
    const pathParts = req.url?.split('/') || [];
    const cancelIndex = pathParts.indexOf('cancel');
    
    if (cancelIndex !== -1 && pathParts[cancelIndex + 1]) {
      const executionId = pathParts[cancelIndex + 1];
      
      const execution = await orchestratorModule.flowOrchestrator.getExecution(executionId);
      
      if (!execution) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }
      
      // In a real implementation, we'd cancel the pipeline
      res.json({
        message: 'Deployment cancellation requested',
        executionId
      });
    } else {
      res.status(400).json({ error: 'Missing deployment ID' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
