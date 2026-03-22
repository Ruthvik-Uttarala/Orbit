"use strict";
// ============================================================
// Orbit DevOps - Intent Routes (Phase 4)
// Chat interface and natural language intent processing
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const intent_engine_1 = require("../services/intent-engine");
const orchestrator_1 = require("../services/orchestrator");
const context_engine_1 = require("../services/context-engine");
const task_decomposer_1 = require("../services/task-decomposer");
const types_1 = require("../services/types");
exports.intentRouter = (0, express_1.Router)();
// In-memory chat history (per session)
const chatSessions = new Map();
// Process natural language intent
exports.intentRouter.post('/parse', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message) {
        res.status(400).json({ error: 'message is required' });
        return;
    }
    const session = sessionId || (0, uuid_1.v4)();
    // Parse the intent
    const intentResult = (0, intent_engine_1.parseIntent)(message);
    const description = (0, intent_engine_1.getIntentDescription)(intentResult);
    // Store user message
    const userMessage = {
        id: (0, uuid_1.v4)(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        metadata: { intent: intentResult }
    };
    if (!chatSessions.has(session)) {
        chatSessions.set(session, []);
    }
    chatSessions.get(session).push(userMessage);
    const context = (0, context_engine_1.buildSessionContext)(session, chatSessions.get(session));
    if (!intentResult.parameters.environment && context.preferredEnvironment) {
        intentResult.parameters.environment = context.preferredEnvironment;
    }
    if (!intentResult.parameters.feature && context.activeFeature && intentResult.intent === types_1.IntentType.UPDATE) {
        intentResult.parameters.feature = context.activeFeature;
    }
    const plan = (0, task_decomposer_1.createExecutionPlan)(intentResult, context);
    const planPreview = (0, task_decomposer_1.formatPlanPreview)(plan);
    const detailedDescription = `${description}\n\nExecution plan:\n${planPreview}`;
    // If intent is recognized, trigger the flow
    let executionId;
    if (intentResult.intent !== types_1.IntentType.UNKNOWN && intentResult.intent !== types_1.IntentType.STATUS && intentResult.flow) {
        executionId = (0, uuid_1.v4)();
        const execId = executionId;
        // Start flow execution asynchronously
        orchestrator_1.flowOrchestrator.executeFlow(execId, intentResult.flow || 'deploy-flow', intentResult.parameters)
            .then(result => {
            console.log(`[Intent] Flow ${intentResult.flow} completed: ${result.success}`);
        })
            .catch(error => {
            console.error(`[Intent] Flow ${intentResult.flow} failed:`, error);
        });
    }
    // Create system response
    const systemMessage = {
        id: (0, uuid_1.v4)(),
        role: 'system',
        content: detailedDescription,
        timestamp: new Date().toISOString(),
        metadata: {
            intent: intentResult,
            executionId,
            plan,
            context
        }
    };
    chatSessions.get(session).push(systemMessage);
    res.json({
        sessionId: session,
        intent: intentResult,
        context,
        plan,
        response: detailedDescription,
        executionId,
        suggestions: intentResult.intent === types_1.IntentType.UNKNOWN ? (0, intent_engine_1.getSuggestions)() : undefined
    });
});
// Get chat history for a session
exports.intentRouter.get('/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const messages = chatSessions.get(sessionId) || [];
    res.json({ sessionId, messages });
});
// Get suggestions
exports.intentRouter.get('/suggestions', (req, res) => {
    res.json({ suggestions: (0, intent_engine_1.getSuggestions)() });
});
// Get execution status (for polling from chat)
exports.intentRouter.get('/execution/:executionId', (req, res) => {
    const { executionId } = req.params;
    const execution = orchestrator_1.flowOrchestrator.getExecution(executionId);
    if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
    }
    // Transform logs for frontend (plain strings for display)
    const displayLogs = execution.logs.map(log => {
        if (typeof log === 'string')
            return log;
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
//# sourceMappingURL=intent.js.map