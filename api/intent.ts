// ============================================================
// Orbit DevOps - Intent Parsing Endpoint (Vercel Serverless)
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

// Import intent engine services - using require for serverless compatibility
const intentEngine = require('../backend/src/services/intent-engine');
const orchestratorModule = require('../backend/src/services/orchestrator');
const types = require('../backend/src/services/types');

// In-memory chat sessions (serverless-friendly: per-request scoped)
const chatSessions = new Map<string, any[]>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  if (method === 'POST') {
    // Parse intent - /api/intent/parse
    const { message, sessionId } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const session = sessionId || uuidv4();

    // Parse the intent
    const intentResult = intentEngine.parseIntent(message);
    const description = intentEngine.getIntentDescription(intentResult);

    // Store user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      metadata: { intent: intentResult }
    };

    if (!chatSessions.has(session)) {
      chatSessions.set(session, []);
    }
    chatSessions.get(session)!.push(userMessage);

    // If intent is recognized, trigger the flow
    let executionId;
    if (intentResult.intent !== types.IntentType.UNKNOWN && intentResult.intent !== types.IntentType.STATUS && intentResult.flow) {
      executionId = uuidv4();

      // Start flow execution asynchronously
      orchestratorModule.flowOrchestrator.executeFlow(executionId, intentResult.flow, intentResult.parameters)
        .then(result => {
          console.log(`[Intent] Flow ${intentResult.flow} completed: ${result.success}`);
        })
        .catch(error => {
          console.error(`[Intent] Flow ${intentResult.flow} failed:`, error);
        });
    }

    // Create system response
    const systemMessage = {
      id: uuidv4(),
      role: 'system',
      content: description,
      timestamp: new Date().toISOString(),
      metadata: {
        intent: intentResult,
        executionId
      }
    };
    chatSessions.get(session)!.push(systemMessage);

    res.json({
      sessionId: session,
      intent: intentResult,
      response: description,
      executionId,
      suggestions: intentResult.intent === types.IntentType.UNKNOWN ? intentEngine.getSuggestions() : undefined
    });
  } else if (method === 'GET') {
    // Get execution status - /api/intent/execution/:executionId
    const pathParts = req.url?.split('/') || [];
    const executionIndex = pathParts.indexOf('execution');
    
    if (executionIndex !== -1 && pathParts[executionIndex + 1]) {
      const executionId = pathParts[executionIndex + 1];
      const execution = orchestratorModule.flowOrchestrator.getExecution(executionId);

      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      // Transform logs for frontend (plain strings for display)
      const displayLogs = execution.logs.map((log: any) => {
        if (typeof log === 'string') return log;
        return log.message;
      });

      res.json({
        executionId,
        flowName: execution.flowName,
        status: execution.status,
        progress: execution.progress,
        logs: displayLogs,
        startTime: execution.startTime,
        endTime: execution.endTime,
        error: execution.error,
        result: execution.result
      });
    } else {
      // Get suggestions - /api/intent/suggestions
      res.json({ suggestions: intentEngine.getSuggestions() });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
