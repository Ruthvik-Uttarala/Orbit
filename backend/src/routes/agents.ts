// ============================================================
// Orbit DevOps - Agent Routes
// API endpoints for agent execution and management
// ============================================================

import { Router, Request, Response } from 'express';
import { getAgent, getAgentDefinitions, resolveAgentType } from '../agents';

export const agentsRouter = Router();

// Execute agent task
agentsRouter.post('/execute', async (req: Request, res: Response) => {
  const { agentType, input } = req.body;

  if (!agentType) {
    res.status(400).json({ error: 'agentType is required' });
    return;
  }

  const resolvedType = resolveAgentType(agentType);
  if (!resolvedType) {
    res.status(400).json({ error: `Unknown agent type: ${agentType}` });
    return;
  }

  const agent = getAgent(resolvedType);
  if (!agent) {
    res.status(404).json({ error: `Agent not available: ${agentType}` });
    return;
  }

  try {
    const execution = await agent.execute(input || {});

    res.status(200).json({
      executionId: execution.id,
      agentType: execution.agentType,
      status: execution.status,
      output: execution.output,
      logs: execution.logs,
      startTime: execution.startTime,
      endTime: execution.endTime,
      error: execution.error
    });
  } catch (error) {
    res.status(500).json({
      error: 'Agent execution failed',
      message: (error as Error).message
    });
  }
});

// Get all agents
agentsRouter.get('/', (req: Request, res: Response) => {
  res.json({
    agents: getAgentDefinitions()
  });
});
