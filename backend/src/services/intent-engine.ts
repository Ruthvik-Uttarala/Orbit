// ============================================================
// Orbit DevOps - Intent Engine (Phase 4)
// Natural language to flow mapping with typo tolerance
// ============================================================

import { IntentResult, IntentType } from './types';

// Intent pattern definition
interface IntentPattern {
  intent: IntentType;
  flow: string;
  keywords: string[];
  phrases: string[];
  weight: number;
}

// Intent patterns with weighted keywords
const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: IntentType.DEPLOY,
    flow: 'deploy-flow',
    keywords: ['deploy', 'release', 'ship', 'publish', 'launch', 'push live', 'go live', 'production', 'staging'],
    phrases: ['deploy my app', 'release my app', 'ship it', 'push to production', 'go live', 'launch my app', 'put it live', 'make it live', 'send to staging', 'deploy to production'],
    weight: 1.0
  },
  {
    intent: IntentType.BUILD,
    flow: 'build-flow',
    keywords: ['build', 'compile', 'create', 'make', 'generate', 'scaffold', 'setup', 'initialize'],
    phrases: ['build my app', 'create my app', 'build the project', 'make my app', 'generate the app', 'set up my project', 'start a new project'],
    weight: 1.0
  },
  {
    intent: IntentType.FIX,
    flow: 'debug-flow',
    keywords: ['fix', 'debug', 'repair', 'solve', 'resolve', 'broken', 'error', 'bug', 'issue', 'crash', 'failing', 'failed'],
    phrases: ['fix my app', 'fix the broken build', 'debug the error', 'solve the issue', 'repair the bug', 'why is it broken', 'it crashed', 'the build failed', 'fix the failing tests'],
    weight: 1.0
  },
  {
    intent: IntentType.UPDATE,
    flow: 'update-flow',
    keywords: ['update', 'change', 'modify', 'edit', 'add feature', 'improve', 'enhance', 'refactor', 'upgrade'],
    phrases: ['update my app', 'add a feature', 'make a change', 'modify the code', 'improve the app', 'add a feature and deploy', 'enhance the app', 'upgrade dependencies'],
    weight: 1.0
  },
  {
    intent: IntentType.TEST,
    flow: 'test-flow',
    keywords: ['test', 'check', 'verify', 'validate', 'run tests', 'quality'],
    phrases: ['run the tests', 'test my app', 'check if it works', 'verify the build', 'run quality checks', 'validate the code'],
    weight: 1.0
  },
  {
    intent: IntentType.ROLLBACK,
    flow: 'rollback-flow',
    keywords: ['rollback', 'revert', 'undo', 'go back', 'previous version', 'restore'],
    phrases: ['rollback the deployment', 'revert to previous version', 'undo the last change', 'go back to the old version', 'restore previous version'],
    weight: 1.0
  },
  {
    intent: IntentType.STATUS,
    flow: 'status-check',
    keywords: ['status', 'how is', 'what is', 'progress', 'state', 'check on'],
    phrases: ['what is the status', 'how is my app', 'check the progress', 'what is happening', 'show me the status', 'is it done'],
    weight: 0.8
  }
];

/**
 * Calculate Levenshtein distance between two strings for typo tolerance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if a word is a fuzzy match for a keyword (typo tolerance)
 */
function fuzzyMatch(word: string, keyword: string, threshold: number = 2): boolean {
  if (word === keyword) return true;
  if (word.length < 3 || keyword.length < 3) return word === keyword;
  
  // Check if one contains the other
  if (word.includes(keyword) || keyword.includes(word)) return true;
  
  // Levenshtein distance check
  const distance = levenshteinDistance(word.toLowerCase(), keyword.toLowerCase());
  return distance <= threshold;
}

/**
 * Normalize input text for consistent matching
 */
function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');   // Normalize whitespace
}

function looksLikeGreeting(input: string): boolean {
  const normalized = normalizeInput(input);
  return ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'].includes(normalized);
}

/**
 * Extract parameters from the input based on intent
 */
function extractParameters(input: string, intent: IntentType): Record<string, any> {
  const normalized = normalizeInput(input);
  const params: Record<string, any> = {};

  // Extract environment references
  if (normalized.includes('production') || normalized.includes('prod')) {
    params.environment = 'production';
  } else if (normalized.includes('staging') || normalized.includes('stage')) {
    params.environment = 'staging';
  } else if (normalized.includes('development') || normalized.includes('dev')) {
    params.environment = 'development';
  }

  // Extract feature descriptions for update/create intents
  if (intent === IntentType.UPDATE || intent === IntentType.CREATE) {
    const featureMatch = normalized.match(/(?:add|create|build|make)\s+(?:a\s+)?(.+?)(?:\s+and\s+|$)/);
    if (featureMatch) {
      params.feature = featureMatch[1].trim();
    }
  }

    // Extract version references (use original input to preserve formatting)
    const versionMatch = input.match(/version\s+([^\s]+)/);
    if (versionMatch) {
      params.version = versionMatch[1];
    }

  return params;
}

/**
 * Score an intent pattern against the input
 */
function scoreIntent(input: string, pattern: IntentPattern): number {
  const normalized = normalizeInput(input);
  const words = normalized.split(' ');
  let score = 0;

  // Check exact phrase matches (highest weight)
  for (const phrase of pattern.phrases) {
    if (normalized.includes(phrase)) {
      score += 10 * pattern.weight;
      break;
    }
    // Check fuzzy phrase match
    const phraseWords = phrase.split(' ');
    let phraseMatchCount = 0;
    for (const pw of phraseWords) {
      if (words.some(w => fuzzyMatch(w, pw))) {
        phraseMatchCount++;
      }
    }
    const phraseMatchRatio = phraseMatchCount / phraseWords.length;
    if (phraseMatchRatio >= 0.7) {
      score += 7 * pattern.weight * phraseMatchRatio;
    }
  }

  // Check keyword matches
  for (const keyword of pattern.keywords) {
    // Exact keyword match
    if (normalized.includes(keyword)) {
      score += 5 * pattern.weight;
    } else {
      // Fuzzy keyword match
      for (const word of words) {
        if (fuzzyMatch(word, keyword)) {
          score += 3 * pattern.weight;
          break;
        }
      }
    }
  }

  return score;
}

/**
 * Main intent parsing function
 */
export function parseIntent(input: string): IntentResult {
  const normalized = normalizeInput(input);
  
  if (!normalized || normalized.length === 0) {
    return {
      intent: IntentType.UNKNOWN,
      confidence: 0,
      flow: '',
      parameters: {},
      rawInput: input,
      normalizedInput: normalized,
      reasoning: 'Empty input received'
    };
  }

  // Score all patterns
  const scores = INTENT_PATTERNS.map(pattern => ({
    pattern,
    score: scoreIntent(input, pattern)
  }));

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const bestMatch = scores[0];
  const secondBest = scores[1];

  // Calculate confidence
  let confidence = 0;
  if (bestMatch.score > 0) {
    const maxPossibleScore = 15; // Rough max for a perfect match
    confidence = Math.min(bestMatch.score / maxPossibleScore, 1.0);
    
    // Reduce confidence if second best is close
    if (secondBest && secondBest.score > 0) {
      const gap = bestMatch.score - secondBest.score;
      if (gap < 2) {
        confidence *= 0.7; // Ambiguous
      }
    }
  }

  // If confidence is too low, return unknown
  if (confidence < 0.15) {
    return {
      intent: IntentType.UNKNOWN,
      confidence,
      flow: '',
      parameters: {},
      rawInput: input,
      normalizedInput: normalized,
      reasoning: `No strong intent match found. Best guess was "${bestMatch.pattern.intent}" with low confidence.`
    };
  }

  const intent = bestMatch.pattern.intent;
  const parameters = extractParameters(input, intent);

  // Determine the flow - handle compound intents like "add a feature and deploy"
  let flow = bestMatch.pattern.flow;
  if (normalized.includes('and deploy') || normalized.includes('then deploy')) {
    flow = 'multi-agent-flow';
    parameters.includeDeployment = true;
  }

  return {
    intent,
    confidence: Math.round(confidence * 100) / 100,
    flow,
    parameters,
    rawInput: input,
    normalizedInput: normalized,
    reasoning: `Matched intent "${intent}" via ${bestMatch.score >= 10 ? 'phrase' : 'keyword'} matching with score ${bestMatch.score.toFixed(1)}`
  };
}

/**
 * Get a user-friendly description of what the system will do
 */
export function getIntentDescription(result: IntentResult): string {
  switch (result.intent) {
    case IntentType.DEPLOY:
      const env = result.parameters.environment || 'staging';
      return `I'll deploy your app to ${env}. I'll run the checks and release steps for you.`;
    case IntentType.BUILD:
      return `I'll build your app and make sure the basics are in place.`;
    case IntentType.FIX:
      return `I'll analyze the problem, try a fix, and check that everything works again.`;
    case IntentType.UPDATE:
      const feature = result.parameters.feature ? ` to add ${result.parameters.feature}` : '';
      return `I'll update your app${feature}, check the result, and save the changes for you.`;
    case IntentType.TEST:
      return `I'll run a full app check and share the results in plain English.`;
    case IntentType.ROLLBACK:
      return `I'll bring your app back to the last version that was working well.`;
    case IntentType.STATUS:
      return `Let me check what Orbit is doing right now and how your app is looking.`;
    default:
      if (looksLikeGreeting(result.rawInput)) {
        return `Hi! I can help you deploy your app, run tests, fix a broken build, or check the current status.`;
      }
      return `I’m not fully sure yet. Try something simple like "Deploy my app" or "Fix the broken build".`;
  }
}

/**
 * Get suggested actions when intent is unknown
 */
export function getSuggestions(): string[] {
  return [
    'Deploy my app',
    'Build my app',
    'Fix the broken build',
    'Add a feature and deploy it',
    'Run the tests',
    'What is the status?'
  ];
}
