"use strict";
// ============================================================
// Orbit DevOps - Status Summary Service
// Builds plain-English status snapshots for chat/status requests
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatusSummary = buildStatusSummary;
const types_1 = require("./types");
const orchestrator_1 = require("./orchestrator");
function normalizeExecutionStatus(execution) {
    if (!execution) {
        return 'pending';
    }
    const pipelineStatus = execution.latestPipeline?.status || execution.result?.latestPipeline?.status;
    if (pipelineStatus === 'created' || pipelineStatus === 'pending' || pipelineStatus === 'running') {
        return 'running';
    }
    if (execution.status === types_1.FlowStatus.COMPLETED) {
        return 'completed';
    }
    if (execution.status === types_1.FlowStatus.FAILED) {
        return 'failed';
    }
    return execution.status === types_1.FlowStatus.RUNNING ? 'running' : 'pending';
}
function describeLatestExecution(execution) {
    if (!execution) {
        return 'Nothing has run yet. You can ask me to build, test, fix, or deploy your app.';
    }
    const displayStatus = normalizeExecutionStatus(execution);
    const friendlyName = execution.flowName.replace(/-/g, ' ');
    const latestPipeline = execution.latestPipeline || execution.result?.latestPipeline;
    if (displayStatus === 'running' && latestPipeline) {
        return `Your latest ${friendlyName} is still running. GitLab pipeline #${latestPipeline.id} on ${latestPipeline.ref} is ${latestPipeline.status}.`;
    }
    if (displayStatus === 'completed') {
        return execution.result?.userMessage
            || `Your latest ${friendlyName} completed successfully.`;
    }
    if (displayStatus === 'failed') {
        return execution.error
            || execution.result?.userMessage
            || `Your latest ${friendlyName} failed. I can help debug it.`;
    }
    return `Your latest ${friendlyName} is queued and waiting to start.`;
}
function describeSessionContext(context) {
    if (!context) {
        return undefined;
    }
    const parts = [];
    if (context.preferredEnvironment) {
        parts.push(`Preferred environment: ${context.preferredEnvironment}.`);
    }
    if (context.activeFeature) {
        parts.push(`Active feature: ${context.activeFeature}.`);
    }
    if (context.recentActions.length > 0) {
        parts.push(`Recent actions: ${context.recentActions.join(', ')}.`);
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
}
async function buildStatusSummary(context) {
    const [latestExecution] = orchestrator_1.flowOrchestrator.getAllExecutions();
    const refreshedExecution = latestExecution
        ? await orchestrator_1.flowOrchestrator.getExecution(latestExecution.id)
        : undefined;
    const latestPipeline = refreshedExecution?.latestPipeline || refreshedExecution?.result?.latestPipeline;
    const messageParts = [describeLatestExecution(refreshedExecution)];
    const contextSummary = describeSessionContext(context);
    if (contextSummary) {
        messageParts.push(contextSummary);
    }
    return {
        message: messageParts.join('\n\n'),
        latestExecution: refreshedExecution,
        latestPipeline
    };
}
//# sourceMappingURL=status-summary.js.map