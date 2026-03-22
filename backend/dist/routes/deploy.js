"use strict";
// ============================================================
// Orbit DevOps - Deploy Routes
// API endpoints for deployment operations
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const types_1 = require("../services/types");
const orchestrator_1 = require("../services/orchestrator");
exports.deployRouter = (0, express_1.Router)();
// Deploy endpoint - triggers deployment flow
exports.deployRouter.post('/', async (req, res) => {
    const { environment, version, branch, parameters } = req.body;
    const executionId = (0, uuid_1.v4)();
    console.log(`[Deploy] Deployment requested: ${executionId}`, {
        environment,
        version,
        branch,
        parameters
    });
    // Start deployment asynchronously
    orchestrator_1.flowOrchestrator.executeFlow(executionId, 'deploy-flow', {
        environment: environment || 'staging',
        version: version || 'latest',
        branch: branch || 'main',
        ...parameters
    }).then(result => {
        console.log(`[Deploy] Deployment ${executionId} completed:`, result.success ? 'SUCCESS' : 'FAILED');
    }).catch(error => {
        console.error(`[Deploy] Deployment ${executionId} error:`, error);
    });
    const response = {
        executionId,
        status: types_1.FlowStatus.PENDING,
        message: `Deployment to ${environment || 'staging'} initiated`,
        timestamp: new Date().toISOString()
    };
    res.status(202).json(response);
});
// Get deployment status
exports.deployRouter.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    const execution = orchestrator_1.flowOrchestrator.getExecution(id);
    if (!execution) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
    }
    const displayLogs = execution.logs.map(log => {
        if (typeof log === 'string')
            return log;
        return log.message;
    });
    res.json({
        executionId: id,
        status: execution.status,
        progress: execution.progress,
        logs: displayLogs,
        startTime: execution.startTime,
        endTime: execution.endTime,
        error: execution.error,
        result: execution.result,
        latestPipeline: execution.latestPipeline,
        pipelines: execution.pipelines
    });
});
// Cancel deployment
exports.deployRouter.post('/cancel/:id', async (req, res) => {
    const { id } = req.params;
    const execution = orchestrator_1.flowOrchestrator.getExecution(id);
    if (!execution) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
    }
    // In a real implementation, we'd cancel the pipeline
    res.json({
        message: 'Deployment cancellation requested',
        executionId: id
    });
});
//# sourceMappingURL=deploy.js.map