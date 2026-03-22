import { buildStatusSummary } from './status-summary';
import { flowOrchestrator } from './orchestrator';

describe('Status Summary', () => {
  it('returns a helpful message when no executions exist', async () => {
    const summary = await buildStatusSummary();

    expect(summary.message).toContain('Nothing has run yet');
    expect(summary.latestExecution).toBeUndefined();
  });

  it('summarizes the latest completed execution with context', async () => {
    const executionId = `status-summary-${Date.now()}`;
    await flowOrchestrator.executeFlow(executionId, 'test-flow', {});

    const summary = await buildStatusSummary({
      sessionId: 'chat-session',
      messageCount: 2,
      preferredEnvironment: 'staging',
      recentActions: ['test'],
      activeFeature: 'status snapshot'
    });

    expect(summary.latestExecution?.id).toBe(executionId);
    expect(summary.message).toContain('tests passed');
    expect(summary.message).toContain('Preferred environment: staging.');
    expect(summary.message).toContain('Recent actions: test.');
  });
});
