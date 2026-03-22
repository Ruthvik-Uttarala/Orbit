import { buildSessionContext } from './context-engine';
import { ChatMessage, IntentType } from './types';

describe('Context Engine', () => {
  it('builds preferred environment and recent actions from chat history', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Deploy to staging',
        timestamp: new Date().toISOString(),
        metadata: {
          intent: {
            intent: IntentType.DEPLOY,
            confidence: 0.9,
            flow: 'deploy-flow',
            parameters: { environment: 'staging' },
            rawInput: 'Deploy to staging',
            normalizedInput: 'deploy to staging',
            reasoning: 'matched'
          }
        }
      },
      {
        id: '2',
        role: 'user',
        content: 'Add login feature',
        timestamp: new Date().toISOString(),
        metadata: {
          intent: {
            intent: IntentType.UPDATE,
            confidence: 0.9,
            flow: 'update-flow',
            parameters: { feature: 'login feature' },
            rawInput: 'Add login feature',
            normalizedInput: 'add login feature',
            reasoning: 'matched'
          }
        }
      }
    ];

    const context = buildSessionContext('session-1', messages);

    expect(context.sessionId).toBe('session-1');
    expect(context.messageCount).toBe(2);
    expect(context.lastIntent).toBe(IntentType.UPDATE);
    expect(context.preferredEnvironment).toBe('staging');
    expect(context.activeFeature).toBe('login feature');
    expect(context.recentActions).toEqual(['deploy', 'update']);
  });
});
