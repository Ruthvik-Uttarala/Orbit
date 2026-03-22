"use strict";
// ============================================================
// Orbit DevOps - Flow Routes
// API endpoints for flow execution and management
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowsRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const types_1 = require("../services/types");
const orchestrator_1 = require("../services/orchestrator");
const flow_catalog_1 = require("../services/flow-catalog");
exports.flowsRouter = (0, express_1.Router)();
// Get all flow definitions
exports.flowsRouter.get('/definitions', (_req, res) => {
    try {
        const definitions = (0, flow_catalog_1.loadFlowCatalog)().map(({ fileName, definition }) => ({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load flow definitions', details: error.message });
    }
});
// Resolve flows for a trigger event
exports.flowsRouter.post('/resolve-trigger', (req, res) => {
    try {
        const { type, action, endpoint, project, ref } = req.body || {};
        if (!type) {
            res.status(400).json({ error: 'type is required' });
            return;
        }
        const matches = (0, flow_catalog_1.resolveFlowsForTrigger)({ type, action, endpoint, project, ref }).map(({ fileName, definition }) => ({
            fileName,
            flowName: definition.name,
            description: definition.description,
            triggers: definition.triggers
        }));
        res.json({
            trigger: { type, action, endpoint, project, ref },
            matches
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to resolve trigger', details: error.message });
    }
});
// Trigger execution from a trigger event
exports.flowsRouter.post('/trigger-event', async (req, res) => {
    try {
        const { trigger, parameters } = req.body || {};
        if (!trigger?.type) {
            res.status(400).json({ error: 'trigger.type is required' });
            return;
        }
        const matches = (0, flow_catalog_1.resolveFlowsForTrigger)(trigger);
        if (matches.length === 0) {
            res.status(404).json({ error: 'No matching flow found for trigger' });
            return;
        }
        const selectedFlow = matches[0].definition.name;
        const executionId = (0, uuid_1.v4)();
        orchestrator_1.flowOrchestrator.executeFlow(executionId, selectedFlow, {
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
            status: types_1.FlowStatus.PENDING,
            message: `Started ${selectedFlow} from ${trigger.type} trigger`
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to trigger flow from event', details: error.message });
    }
});
// Get flow status
exports.flowsRouter.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    const execution = await orchestrator_1.flowOrchestrator.getExecution(id);
    if (!execution) {
        res.status(404).json({ error: 'Flow execution not found' });
        return;
    }
    // Convert logs to plain strings for frontend
    const displayLogs = execution.logs.map(log => {
        if (typeof log === 'string')
            return log;
        return log.message;
    });
    res.json({
        ...execution,
        logs: displayLogs
    });
});
// Get flow logs
exports.flowsRouter.get('/logs/:id', async (req, res) => {
    const { id } = req.params;
    const execution = await orchestrator_1.flowOrchestrator.getExecution(id);
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
        if (typeof log === 'string')
            return log;
        return log.message;
    });
    res.json({ logs });
});
// Trigger a flow execution
exports.flowsRouter.post('/trigger', async (req, res) => {
    try {
        const { flowName, parameters } = req.body;
        if (!flowName) {
            res.status(400).json({ error: 'flowName is required' });
            return;
        }
        const executionId = (0, uuid_1.v4)();
        const execution = {
            id: executionId,
            flowName,
            status: types_1.FlowStatus.PENDING,
            parameters: parameters || {},
            startTime: new Date().toISOString(),
            logs: [],
            progress: []
        };
        // Start flow execution asynchronously
        orchestrator_1.flowOrchestrator.executeFlow(executionId, flowName, parameters || {})
            .then(result => {
            console.log(`[Flow] ${flowName} completed: ${result.success}`);
        })
            .catch(error => {
            console.error(`[Flow] ${flowName} error:`, error);
        });
        res.status(202).json({
            executionId,
            status: types_1.FlowStatus.PENDING,
            message: 'Flow execution started'
        });
    }
    catch (error) {
        console.error('[Flow] Trigger error:', error);
        res.status(500).json({
            error: 'Failed to trigger flow',
            details: error.message
        });
    }
});
// List all flow executions
exports.flowsRouter.get('/', (_req, res) => {
    const executions = orchestrator_1.flowOrchestrator.getAllExecutions();
    // Convert logs to plain strings
    const displayExecutions = executions.map(exec => ({
        ...exec,
        logs: exec.logs.map(log => typeof log === 'string' ? log : log.message)
    }));
    res.json({ executions: displayExecutions });
});
//# sourceMappingURL=flows.js.map