// ============================================================
// Orbit DevOps - Agents Endpoint (Vercel Serverless)
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import agents - using require for serverless compatibility
const agentsModule = require('../backend/src/agents');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // POST /api/agents/execute - Execute agent task
  if (method === 'POST') {
    const { agentType, input } = req.body;

    if (!agentType) {
      res.status(400).json({ error: 'agentType is required' });
      return;
    }

    const resolvedType = agentsModule.resolveAgentType(agentType);
    if (!resolvedType) {
      res.status(400).json({ error: `Unknown agent type: ${agentType}` });
      return;
    }

    const agent = agentsModule.getAgent(resolvedType);
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
  } 
  // GET /api/agents - Get all agents
  else if (method === 'GET') {
    res.json({
      agents: agentsModule.getAgentDefinitions()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
