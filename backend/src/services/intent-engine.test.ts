// ============================================================
// Orbit DevOps - Intent Engine Tests
// Unit tests for natural language intent parsing
// ============================================================

import { parseIntent, getIntentDescription } from './intent-engine';
import { IntentType } from './types';

describe('Intent Engine', () => {
  describe('parseIntent', () => {
    it('should recognize deploy intent', () => {
      const result = parseIntent('Deploy my app');
      expect(result.intent).toBe(IntentType.DEPLOY);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.flow).toBe('deploy-flow');
    });

    it('should recognize deploy with variations', () => {
      const result = parseIntent('Please deploy my application to production');
      expect(result.intent).toBe(IntentType.DEPLOY);
      expect(result.parameters.environment).toBe('production');
    });

    it('should recognize build intent', () => {
      const result = parseIntent('Build my app');
      expect(result.intent).toBe(IntentType.BUILD);
      expect(result.flow).toBe('build-flow');
    });

    it('should recognize fix intent', () => {
      const result = parseIntent('Fix the broken build');
      expect(result.intent).toBe(IntentType.FIX);
      expect(result.flow).toBe('debug-flow');
    });

    it('should recognize update intent', () => {
      const result = parseIntent('Add a login feature and deploy it');
      expect(result.intent).toBe(IntentType.UPDATE);
      expect(result.parameters.feature).toBe('login feature');
    });

    it('should recognize test intent', () => {
      const result = parseIntent('Run the tests');
      expect(result.intent).toBe(IntentType.TEST);
      expect(result.flow).toBe('test-flow');
    });

    it('should handle unknown intent gracefully', () => {
      const result = parseIntent('blah blah blah');
      expect(result.intent).toBe(IntentType.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.2);
    });

    it('should handle empty input', () => {
      const result = parseIntent('');
      expect(result.intent).toBe(IntentType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('should handle typo tolerance', () => {
      const result = parseIntent('Deply my app'); // Misspelled deploy
      expect(result.intent).toBe(IntentType.DEPLOY);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should extract parameters correctly', () => {
      const result = parseIntent('Deploy to production version v2.0');
      expect(result.parameters.environment).toBe('production');
      expect(result.parameters.version).toBe('v2.0');
    });

    it('should handle compound intents', () => {
      const result = parseIntent('Add a user profile feature and deploy it');
      expect(result.intent).toBe(IntentType.UPDATE);
      expect(result.parameters.feature).toBe('user profile feature');
      expect(result.parameters.includeDeployment).toBe(true);
    });
  });

  describe('getIntentDescription', () => {
    it('should return proper description for deploy', () => {
      const result = parseIntent('Deploy my app');
      const description = getIntentDescription(result);
      expect(description).toContain('deploy');
      expect(description).toContain('staging');
    });

    it('should return proper description for build', () => {
      const result = parseIntent('Build my app');
      const description = getIntentDescription(result);
      expect(description).toContain('build');
    });

    it('should return proper description for fix', () => {
      const result = parseIntent('Fix my app');
      const description = getIntentDescription(result);
      expect(description).toContain('analyze');
      expect(description).toContain('fix');
    });
  });
});
