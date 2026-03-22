// ============================================================
// Orbit DevOps - Intent Routes (Phase 4)
// Chat interface and natural language intent processing
// ============================================================

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { parseIntent, getIntentDescription, getSuggestions } from '../services/intent-engine';
import { flowOrchestrator } from '../services/orchestrator';
import { IntentType, ChatMessage, FlowStatus } from '../services/types';

export const intentRouter = Router();

// In-memory chat history (per session)
const chatSessions: Map<string, ChatMessage[]> = new Map();

// Process natural language intent
intentRouter.post('/parse', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const session = sessionId || uuidv4();

  // Parse the intent
  const intentResult = parseIntent(message);
  const description = getIntentDescription(intentResult);

  // Store user message
  const userMessage: ChatMessage = {
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
  let executionId: string | undefined;
  if (intentResult.intent !== IntentType.UNKNOWN && intentResult.intent !== IntentType.STATUS && intentResult.flow) {
    executionId = uuidv4();
    const execId = executionId;

    // Start flow execution asynchronously
    flowOrchestrator.executeFlow(execId, intentResult.flow || 'deploy-flow', intentResult.parameters)
      .then(result => {
        console.log(`[Intent] Flow ${intentResult.flow} completed: ${result.success}`);
      })
      .catch(error => {
        console.error(`[Intent] Flow ${intentResult.flow} failed:`, error);
      });
  }

  // Create system response
  const systemMessage: ChatMessage = {
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
    suggestions: intentResult.intent === IntentType.UNKNOWN ? getSuggestions() : undefined
  });
});

// Get chat history for a session
intentRouter.get('/chat/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const messages = chatSessions.get(sessionId) || [];

  res.json({ sessionId, messages });
});

// Get suggestions
intentRouter.get('/suggestions', (req: Request, res: Response) => {
  res.json({ suggestions: getSuggestions() });
});

// Get execution status (for polling from chat)
intentRouter.get('/execution/:executionId', (req: Request, res: Response) => {
  const { executionId } = req.params;
  const execution = flowOrchestrator.getExecution(executionId);

  if (!execution) {
    res.status(404).json({ error: 'Execution not found' });
    return;
  }

  // Transform logs for frontend (plain strings for display)
  const displayLogs = execution.logs.map(log => {
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
});
