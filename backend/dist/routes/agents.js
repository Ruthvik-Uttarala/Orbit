"use strict";
// ============================================================
// Orbit DevOps - Agent Routes
// API endpoints for agent execution and management
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentsRouter = void 0;
const express_1 = require("express");
const agents_1 = require("../agents");
exports.agentsRouter = (0, express_1.Router)();
// Execute agent task
exports.agentsRouter.post('/execute', async (req, res) => {
    const { agentType, input } = req.body;
    if (!agentType) {
        res.status(400).json({ error: 'agentType is required' });
        return;
    }
    const resolvedType = (0, agents_1.resolveAgentType)(agentType);
    if (!resolvedType) {
        res.status(400).json({ error: `Unknown agent type: ${agentType}` });
        return;
    }
    const agent = (0, agents_1.getAgent)(resolvedType);
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
    }
    catch (error) {
        res.status(500).json({
            error: 'Agent execution failed',
            message: error.message
        });
    }
});
// Get all agents
exports.agentsRouter.get('/', (req, res) => {
    res.json({
        agents: (0, agents_1.getAgentDefinitions)()
    });
});
//# sourceMappingURL=agents.js.map