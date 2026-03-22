// ============================================================
// Orbit DevOps - Context Engine
// Builds lightweight session context from recent chat history
// ============================================================

import { ChatMessage, IntentType, SessionContext } from './types';

function uniqueRecentActions(messages: ChatMessage[]): string[] {
  const actions: string[] = [];

  for (const message of messages) {
    const intent = message.metadata?.intent?.intent;
    if (!intent || intent === IntentType.UNKNOWN || intent === IntentType.STATUS) {
      continue;
    }

    if (!actions.includes(intent)) {
      actions.push(intent);
    }
  }

  return actions.slice(-3);
}

export function buildSessionContext(sessionId: string, messages: ChatMessage[]): SessionContext {
  const messagesWithIntent = messages.filter(message => message.metadata?.intent);
  const lastIntentMessage = [...messagesWithIntent]
    .reverse()
    .find(message => message.metadata?.intent?.intent !== IntentType.UNKNOWN);

  const lastIntent = lastIntentMessage?.metadata?.intent?.intent;
  const preferredEnvironment = [...messagesWithIntent]
    .reverse()
    .map(message => message.metadata?.intent?.parameters?.environment)
    .find(Boolean);
  const activeFeature = [...messagesWithIntent]
    .reverse()
    .map(message => message.metadata?.intent?.parameters?.feature)
    .find(Boolean);

  return {
    sessionId,
    messageCount: messages.length,
    lastIntent,
    preferredEnvironment,
    recentActions: uniqueRecentActions(messages),
    activeFeature
  };
}
