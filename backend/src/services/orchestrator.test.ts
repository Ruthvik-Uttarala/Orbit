// ============================================================
// Orbit DevOps - Orchestrator Tests
// Unit tests for flow orchestration
// ============================================================

import { flowOrchestrator } from './orchestrator';
import { FlowStatus } from './types';
import { gitlabAdapter } from './gitlab-adapter';

jest.setTimeout(90000);

describe('Flow Orchestrator', () => {
  it('should execute a simple flow', async () => {
    const result = await flowOrchestrator.executeFlow('test-exec-1', 'deploy-flow', {});
    expect(result.success).toBe(true);
  });

  it('should handle unknown flow gracefully', async () => {
    const result = await flowOrchestrator.executeFlow('test-exec-2', 'non-existent-flow', {});
    // Should still return a result (built-in flow fallback)
    expect(result).toBeDefined();
  }, 30000);

  it('should track execution status', async () => {
    const execId = 'test-exec-3';
    await flowOrchestrator.executeFlow(execId, 'deploy-flow', {});
    
    const execution = await flowOrchestrator.getExecution(execId);
    expect(execution).toBeDefined();
    if (execution) {
      expect(execution.id).toBe(execId);
      expect(execution.flowName).toBe('deploy-flow');
    }
  });

  it('should finalize a running execution after the GitLab pipeline succeeds', async () => {
    const execId = 'test-exec-pipeline-success';
    const timestamp = new Date().toISOString();
    const pipeline = {
      id: 4242,
      status: 'running' as const,
      ref: 'hackathon-mvp',
      url: 'https://gitlab.com/tmushd/Orbit/-/pipelines/4242',
      provider: 'gitlab' as const,
      source: 'deploy-agent' as const,
      environment: 'staging',
      updatedAt: timestamp
    };

    const execution = {
      id: execId,
      flowName: 'deploy-flow',
      status: FlowStatus.RUNNING,
      parameters: {},
      startTime: timestamp,
      logs: [],
      progress: [
        {
          stage: 'deploy',
          agent: 'deploy-agent',
          status: 'running' as const,
          timestamp
        }
      ],
      result: {
        success: true,
        message: 'Waiting for GitLab pipeline to finish',
        userMessage: 'Your deployment pipeline is running in GitLab for staging.',
        output: {
          environment: 'staging',
          pipelinePending: true
        },
        latestPipeline: pipeline,
        pipelines: [pipeline]
      },
      latestPipeline: pipeline,
      pipelines: [pipeline]
    };

    const getPipelineStatusSpy = jest.spyOn(gitlabAdapter, 'getPipelineStatus').mockResolvedValue({
      id: 4242,
      status: 'success',
      ref: 'hackathon-mvp',
      webUrl: 'https://gitlab.com/tmushd/Orbit/-/pipelines/4242',
      createdAt: timestamp,
      updatedAt: new Date(Date.now() + 1000).toISOString()
    });

    (flowOrchestrator as any).executions.set(execId, execution);

    const refreshedExecution = await flowOrchestrator.getExecution(execId);

    expect(refreshedExecution?.status).toBe(FlowStatus.COMPLETED);
    expect(refreshedExecution?.result?.success).toBe(true);
    expect(refreshedExecution?.result?.output?.pipelinePending).toBe(false);
    expect(refreshedExecution?.latestPipeline?.status).toBe('success');
    expect(refreshedExecution?.progress[0].status).toBe('completed');

    getPipelineStatusSpy.mockRestore();
    (flowOrchestrator as any).executions.delete(execId);
  });
});
