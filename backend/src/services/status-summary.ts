// ============================================================
// Orbit DevOps - Status Summary Service
// Builds plain-English status snapshots for chat/status requests
// ============================================================

import { FlowExecution, FlowStatus, PipelineSummary, SessionContext } from './types';
import { flowOrchestrator } from './orchestrator';

export interface StatusSnapshot {
  message: string;
  latestExecution?: FlowExecution;
  latestPipeline?: PipelineSummary;
}

function normalizeExecutionStatus(execution?: FlowExecution): 'running' | 'completed' | 'failed' | 'pending' {
  if (!execution) {
    return 'pending';
  }

  const pipelineStatus = execution.latestPipeline?.status || execution.result?.latestPipeline?.status;
  if (pipelineStatus === 'created' || pipelineStatus === 'pending' || pipelineStatus === 'running') {
    return 'running';
  }

  if (execution.status === FlowStatus.COMPLETED) {
    return 'completed';
  }

  if (execution.status === FlowStatus.FAILED) {
    return 'failed';
  }

  return execution.status === FlowStatus.RUNNING ? 'running' : 'pending';
}

function describeLatestExecution(execution?: FlowExecution): string {
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

function describeSessionContext(context?: SessionContext): string | undefined {
  if (!context) {
    return undefined;
  }

  const parts: string[] = [];

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

export async function buildStatusSummary(context?: SessionContext): Promise<StatusSnapshot> {
  const [latestExecution] = flowOrchestrator.getAllExecutions();
  const refreshedExecution = latestExecution
    ? await flowOrchestrator.getExecution(latestExecution.id)
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
