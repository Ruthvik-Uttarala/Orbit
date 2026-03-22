import { IntentResult } from './types';
/**
 * Main intent parsing function
 */
export declare function parseIntent(input: string): IntentResult;
/**
 * Get a user-friendly description of what the system will do
 */
export declare function getIntentDescription(result: IntentResult): string;
/**
 * Get suggested actions when intent is unknown
 */
export declare function getSuggestions(): string[];
//# sourceMappingURL=intent-engine.d.ts.map