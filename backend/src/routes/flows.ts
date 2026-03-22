// ============================================================
// Orbit DevOps - Flow Routes
// API endpoints for flow execution and management
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FlowExecution, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export const flowsRouter = Router();

// Get all flow definitions
flowsRouter.get('/definitions', (_req: Request, res: Response) => {
  try {
    // Try multiple paths for flows directory
    const possiblePaths = [
      path.join(process.cwd(), 'flows'),
      path.join(process.cwd(), '..', 'flows'),
      path.join(__dirname, '..', '..', 'flows')
    ];
    
    let flowsDir = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        flowsDir = p;
        break;
      }
    }
    
    if (!flowsDir) {
      res.json({ flows: [] });
      return;
    }
    
    const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.yaml'));
    
    const definitions = files.map(file => {
      try {
        const content = fs.readFileSync(path.join(flowsDir, file), 'utf-8');
        const parsed = yaml.load(content) as any;
        return {
          name: parsed.name,
          version: parsed.version,
          description: parsed.description,
          triggers: parsed.triggers,
          stages: parsed.stages?.map((s: any) => s.name) || []
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    res.json({ flows: definitions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load flow definitions', details: (error as Error).message });
  }
});

// Get flow status
flowsRouter.get('/status/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const execution = await flowOrchestrator.getExecution(id);
  
  if (!execution) {
    res.status(404).json({ error: 'Flow execution not found' });
    return;
  }
  
  // Convert logs to plain strings for frontend
  const displayLogs = execution.logs.map(log => {
    if (typeof log === 'string') return log;
    return log.message;
  });
  
  res.json({
    ...execution,
    logs: displayLogs
  });
});

// Get flow logs
flowsRouter.get('/logs/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const execution = await flowOrchestrator.getExecution(id);
  
  if (!execution) {
    res.status(404).json({ error: 'Flow execution not found' });
    return;
  }
  
  const logs = execution.logs.map(log => {
    if (typeof log === 'string') return log;
    return log.message;
  });
  
  res.json({ logs });
});

// Trigger a flow execution
flowsRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { flowName, parameters } = req.body;
    
    if (!flowName) {
      res.status(400).json({ error: 'flowName is required' });
      return;
    }
    
    const executionId = uuidv4();
    
    const execution: FlowExecution = {
      id: executionId,
      flowName,
      status: FlowStatus.PENDING,
      parameters: parameters || {},
      startTime: new Date().toISOString(),
      logs: [],
      progress: []
    };
    
    // Start flow execution asynchronously
    flowOrchestrator.executeFlow(executionId, flowName, parameters || {})
      .then(result => {
        console.log(`[Flow] ${flowName} completed: ${result.success}`);
      })
      .catch(error => {
        console.error(`[Flow] ${flowName} error:`, error);
      });
    
    res.status(202).json({
      executionId,
      status: FlowStatus.PENDING,
      message: 'Flow execution started'
    });
  } catch (error) {
    console.error('[Flow] Trigger error:', error);
    res.status(500).json({ 
      error: 'Failed to trigger flow', 
      details: (error as Error).message 
    });
  }
});

// List all flow executions
flowsRouter.get('/', (_req: Request, res: Response) => {
  const executions = flowOrchestrator.getAllExecutions();
  
  // Convert logs to plain strings
  const displayExecutions = executions.map(exec => ({
    ...exec,
    logs: exec.logs.map(log => typeof log === 'string' ? log : log.message)
  }));
  
  res.json({ executions: displayExecutions });
});
