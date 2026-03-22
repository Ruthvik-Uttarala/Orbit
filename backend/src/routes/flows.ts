// ============================================================
// Orbit DevOps - Flow Routes
// API endpoints for flow execution and management
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FlowExecution, FlowStatus } from '../services/types';
import { flowOrchestrator } from '../services/orchestrator';
import { loadFlowCatalog, resolveFlowsForTrigger } from '../services/flow-catalog';

export const flowsRouter = Router();

// Get all flow definitions
flowsRouter.get('/definitions', (_req: Request, res: Response) => {
  try {
    const definitions = loadFlowCatalog().map(({ fileName, definition }) => ({
      fileName,
      name: definition.name,
      version: definition.version,
      description: definition.description,
      triggers: definition.triggers,
      stages: definition.stages?.map(stage => ({
        name: stage.name,
        agent: stage.agent,
        stepCount: stage.steps?.length || 0
      })) || [],
      agents: Array.from(new Set(definition.stages?.map(stage => stage.agent) || []))
    }));
    
    res.json({ flows: definitions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load flow definitions', details: (error as Error).message });
  }
});

// Resolve flows for a trigger event
flowsRouter.post('/resolve-trigger', (req: Request, res: Response) => {
  try {
    const { type, action, endpoint, project, ref } = req.body || {};

    if (!type) {
      res.status(400).json({ error: 'type is required' });
      return;
    }

    const matches = resolveFlowsForTrigger({ type, action, endpoint, project, ref }).map(({ fileName, definition }) => ({
      fileName,
      flowName: definition.name,
      description: definition.description,
      triggers: definition.triggers
    }));

    res.json({
      trigger: { type, action, endpoint, project, ref },
      matches
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve trigger', details: (error as Error).message });
  }
});

// Trigger execution from a trigger event
flowsRouter.post('/trigger-event', async (req: Request, res: Response) => {
  try {
    const { trigger, parameters } = req.body || {};

    if (!trigger?.type) {
      res.status(400).json({ error: 'trigger.type is required' });
      return;
    }

    const matches = resolveFlowsForTrigger(trigger);
    if (matches.length === 0) {
      res.status(404).json({ error: 'No matching flow found for trigger' });
      return;
    }

    const selectedFlow = matches[0].definition.name;
    const executionId = uuidv4();

    flowOrchestrator.executeFlow(executionId, selectedFlow, {
      trigger,
      ...(parameters || {})
    })
      .then(result => {
        console.log(`[Flow Trigger] ${selectedFlow} completed: ${result.success}`);
      })
      .catch(error => {
        console.error(`[Flow Trigger] ${selectedFlow} failed:`, error);
      });

    res.status(202).json({
      executionId,
      flowName: selectedFlow,
      status: FlowStatus.PENDING,
      message: `Started ${selectedFlow} from ${trigger.type} trigger`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger flow from event', details: (error as Error).message });
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
  
  const structured = req.query.structured === 'true';

  if (structured) {
    res.json({
      executionId: id,
      logs: execution.logs
    });
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
