import { createExecutionPlan } from './task-decomposer';
import { IntentType, SessionContext } from './types';

describe('Task Decomposer', () => {
  const baseContext: SessionContext = {
    sessionId: 'session-1',
    messageCount: 0,
    recentActions: [],
    preferredEnvironment: 'staging'
  };

  it('creates a deploy plan with verification tasks', () => {
    const plan = createExecutionPlan({
      intent: IntentType.DEPLOY,
      confidence: 0.95,
      flow: 'deploy-flow',
      parameters: {},
      rawInput: 'Deploy my app',
      normalizedInput: 'deploy my app',
      reasoning: 'matched'
    }, baseContext);

    expect(plan.flowName).toBe('deploy-flow');
    expect(plan.tasks.map(task => task.id)).toEqual(['validate', 'pipeline', 'verify', 'report']);
  });

  it('creates an update plan that includes deploy when requested', () => {
    const plan = createExecutionPlan({
      intent: IntentType.UPDATE,
      confidence: 0.9,
      flow: 'multi-agent-flow',
      parameters: {
        feature: 'team dashboard',
        includeDeployment: true
      },
      rawInput: 'Add a team dashboard and deploy it',
      normalizedInput: 'add a team dashboard and deploy it',
      reasoning: 'matched'
    }, baseContext);

    expect(plan.strategy).toBe('parallel');
    expect(plan.tasks.some(task => task.id === 'deploy')).toBe(true);
  });
});
