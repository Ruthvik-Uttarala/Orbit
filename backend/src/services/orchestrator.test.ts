// ============================================================
// Orbit DevOps - Orchestrator Tests
// Unit tests for flow orchestration
// ============================================================

import { flowOrchestrator } from './orchestrator';
import { FlowStatus } from './types';

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
    
    const execution = flowOrchestrator.getExecution(execId);
    expect(execution).toBeDefined();
    if (execution) {
      expect(execution.id).toBe(execId);
      expect(execution.flowName).toBe('deploy-flow');
    }
  });
});
