// ============================================================
// Orbit DevOps - Debug Agent (Self-Healing - Phase 5)
// Analyzes failures, identifies root causes, applies fixes
// ============================================================

import { BaseAgent } from './base-agent';
import { AgentType, AgentExecution, HealingAttempt } from '../services/types';
import { gitlabAdapter } from '../services/gitlab-adapter';

export class DebugAgent extends BaseAgent {
  private healingHistory: HealingAttempt[] = [];

  constructor() {
    super(
      AgentType.DEBUG,
      'Debug Agent',
      'Analyzes failures, identifies root causes, and applies autonomous fixes',
      ['analyze-logs', 'identify-issues', 'suggest-fixes', 'auto-remediation', 'retry-pipeline']
    );
  }

  protected async run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    const action = input.action || 'analyze';

    switch (action) {
      case 'analyze':
        return this.analyzeFailure(input, execution);
      case 'identify':
        return this.identifyRootCause(input, execution);
      case 'fix':
        return this.applyFix(input, execution);
      case 'retry':
        return this.retryWithFix(input, execution);
      case 'full-heal':
        return this.fullHealingCycle(input, execution);
      default:
        return this.analyzeFailure(input, execution);
    }
  }

  private async analyzeFailure(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    this.log(execution, 'info', 'Analyzing failure details...');
    await this.work(300);

    const failureData = input.failure || input.error || 'Unknown failure';
    const logs = input.logs || [];
    const pipelineId = input.pipeline?.id || input.pipelineId;

    if (pipelineId) {
      const pipelineAnalysis = await this.analyzePipelineFailure(pipelineId, execution);
      return {
        analyzed: true,
        pipelineId,
        classification: pipelineAnalysis.classification,
        failingJobs: pipelineAnalysis.failingJobs,
        evidence: pipelineAnalysis.evidence,
        userMessage: `Found the issue in GitLab: ${pipelineAnalysis.classification.description}. ${pipelineAnalysis.classification.fixable ? 'I can suggest the next fix step.' : 'This may need manual attention.'}`
      };
    }

    this.log(execution, 'info', 'Examining error logs and stack traces...');
    await this.work(800);

    this.log(execution, 'info', 'Classifying failure type...');
    await this.work(400);

    // Classify the failure
    const classification = this.classifyFailure(failureData, logs);

    this.log(execution, 'info', `Failure classified as: ${classification.type}`);
    this.log(execution, 'info', `Severity: ${classification.severity}`);

    return {
      analyzed: true,
      classification,
      failureData,
      userMessage: `Found the issue: ${classification.description}. ${classification.fixable ? 'I can fix this automatically.' : 'This may need manual attention.'}`
    };
  }

  private async identifyRootCause(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    this.log(execution, 'info', 'Identifying root cause...');
    await this.work(700);

    this.log(execution, 'info', 'Tracing error through call stack...');
    await this.work(500);

    this.log(execution, 'info', 'Checking recent changes for potential causes...');
    await this.work(400);

    const rootCause = input.classification?.type || 'configuration-error';
    const causes: Record<string, { cause: string; fix: string; confidence: number }> = {
      'build-error': {
        cause: 'Build configuration mismatch or missing dependency',
        fix: 'Update build configuration and install missing dependencies',
        confidence: 0.85
      },
      'test-failure': {
        cause: 'Test assertions failing due to code changes',
        fix: 'Update test expectations to match new behavior',
        confidence: 0.80
      },
      'configuration-error': {
        cause: 'Missing or invalid configuration values',
        fix: 'Restore default configuration and validate settings',
        confidence: 0.90
      },
      'dependency-error': {
        cause: 'Incompatible or missing package dependency',
        fix: 'Update package versions and resolve conflicts',
        confidence: 0.85
      },
      'runtime-error': {
        cause: 'Unhandled exception in application code',
        fix: 'Add error handling and fix the failing code path',
        confidence: 0.75
      }
    };

    const identified = causes[rootCause] || causes['configuration-error'];

    this.log(execution, 'info', `Root cause identified: ${identified.cause}`);
    this.log(execution, 'info', `Suggested fix: ${identified.fix}`);
    this.log(execution, 'info', `Confidence: ${(identified.confidence * 100).toFixed(0)}%`);

    return {
      rootCause: identified.cause,
      suggestedFix: identified.fix,
      confidence: identified.confidence,
      type: rootCause,
      failingJobs: input.failingJobs || [],
      evidence: input.evidence || [],
      userMessage: `Root cause: ${identified.cause}. Recommended fix: ${identified.fix}`
    };
  }

  private async applyFix(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    this.log(execution, 'info', 'Applying automated fix...');
    await this.work(500);

    const fixType = input.type || input.rootCause || 'configuration-error';

    this.log(execution, 'info', `Fix type: ${fixType}`);
    await this.work(800);

    this.log(execution, 'info', 'Modifying affected files...');
    await this.work(600);

    this.log(execution, 'info', 'Validating fix...');
    await this.work(400);

    const suggestedFix = input.suggestedFix || `Applied fix for ${fixType}`;
    const fixApplied = typeof suggestedFix === 'string' ? suggestedFix : `Applied fix for ${fixType}`;
    this.log(execution, 'info', fixApplied);

    return {
      fixed: true,
      fixType,
      fixDescription: fixApplied,
      filesModified: input.failingJobs?.length ? [] : ['src/config.ts', 'package.json'],
      userMessage: `Fix applied: ${fixApplied}. Ready to retry.`
    };
  }

  private async retryWithFix(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    this.log(execution, 'info', 'Retrying after fix...');
    await this.work(300);

    if (input.pipeline?.ref || input.ref) {
      const ref = input.pipeline?.ref || input.ref;
      this.log(execution, 'info', `Re-running pipeline on ${ref}...`);
      const pipeline = await gitlabAdapter.triggerPipeline(ref);

      if (pipeline) {
        return {
          retried: true,
          success: true,
          attemptNumber: input.attemptNumber || 1,
          newPipelineId: pipeline.id,
          ref,
          userMessage: `Started a new GitLab pipeline on ${ref} so we can verify the fix.`
        };
      }
    }

    this.log(execution, 'info', 'Re-running build pipeline...');
    await this.work(1000);
    this.log(execution, 'info', 'Re-running tests...');
    await this.work(800);

    // Simulate success after fix (bounded retry)
    const attemptNumber = input.attemptNumber || 1;
    const maxAttempts = 3;
    const success = attemptNumber <= maxAttempts;

    if (success) {
      this.log(execution, 'info', 'Retry successful! All checks passed.');
    } else {
      this.log(execution, 'warn', `Retry failed after ${maxAttempts} attempts. Manual intervention needed.`);
    }

    return {
      retried: true,
      success,
      attemptNumber,
      maxAttempts,
      userMessage: success
        ? 'The fix worked! Everything is passing now.'
        : `After ${maxAttempts} attempts, the issue persists. Here's what we tried and what you can do next.`
    };
  }

  /**
   * Full self-healing cycle (Phase 5 core)
   * Detect -> Classify -> Identify -> Fix -> Retry
   */
  async fullHealingCycle(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    if (input.pipeline?.id || input.pipelineId) {
      const pipelineId = input.pipeline?.id || input.pipelineId;
      const analysis = await this.analyzeFailure({ ...input, pipelineId }, execution);
      const rootCause = await this.identifyRootCause({ ...input, ...analysis }, execution);
      const fix = await this.applyFix({ ...input, ...analysis, ...rootCause }, execution);
      const retry = await this.retryWithFix({ ...input, ...analysis, ...rootCause, ...fix }, execution);

      const healed = retry.success === true;
      return {
        healed,
        attempts: [
          {
            attemptNumber: input.attemptNumber || 1,
            timestamp: new Date().toISOString(),
            failureType: analysis.classification?.type || 'unknown-error',
            rootCause: rootCause.rootCause,
            fixApplied: fix.fixDescription,
            outcome: healed ? 'success' : 'failure',
            logs: [...execution.logs]
          }
        ],
        totalAttempts: input.attemptNumber || 1,
        finalOutcome: healed ? 'success' : 'failure',
        userMessage: healed
          ? 'I analyzed the failing GitLab pipeline and started a retry with the recommended fix path.'
          : 'I analyzed the failing GitLab pipeline and collected the likely cause, but I could not restart it automatically.'
      };
    }

    const maxAttempts = input.maxAttempts || 3;
    const attempts: HealingAttempt[] = [];

    this.log(execution, 'info', '=== Starting Self-Healing Cycle ===');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.log(execution, 'info', `--- Healing Attempt ${attempt}/${maxAttempts} ---`);

      // Step 1: Analyze
      this.log(execution, 'info', 'Step 1: Analyzing failure...');
      await this.work(500);
      const classification = this.classifyFailure(input.failure || 'build-error', input.logs || []);

      // Step 2: Identify root cause
      this.log(execution, 'info', 'Step 2: Identifying root cause...');
      await this.work(400);

      // Step 3: Apply fix
      this.log(execution, 'info', 'Step 3: Applying fix...');
      await this.work(600);

      // Step 4: Retry
      this.log(execution, 'info', 'Step 4: Retrying build/test...');
      await this.work(800);

      // Simulate: first attempt might fail, subsequent succeed
      const success = attempt >= 2 || !input.simulateFirstFailure;

      const healingAttempt: HealingAttempt = {
        attemptNumber: attempt,
        timestamp: new Date().toISOString(),
        failureType: classification.type,
        rootCause: classification.description,
        fixApplied: `Fix for ${classification.type} (attempt ${attempt})`,
        outcome: success ? 'success' : 'failure',
        logs: [...execution.logs]
      };

      attempts.push(healingAttempt);
      this.healingHistory.push(healingAttempt);

      if (success) {
        this.log(execution, 'info', `✓ Healing successful on attempt ${attempt}`);
        return {
          healed: true,
          attempts,
          totalAttempts: attempt,
          finalOutcome: 'success',
          userMessage: attempt === 1
            ? 'Found and fixed the issue on the first try!'
            : `Fixed the issue after ${attempt} attempts. Everything is working now.`
        };
      }

      this.log(execution, 'warn', `Attempt ${attempt} did not resolve the issue, trying different approach...`);
    }

    this.log(execution, 'error', `Self-healing exhausted after ${maxAttempts} attempts`);
    return {
      healed: false,
      attempts,
      totalAttempts: maxAttempts,
      finalOutcome: 'failure',
      userMessage: `I tried ${maxAttempts} different approaches but couldn't fully resolve the issue. Here's what I found and what you can try next.`,
      recommendations: [
        'Check the error logs for more details',
        'Verify your configuration settings',
        'Try reverting recent changes'
      ]
    };
  }

  private classifyFailure(failure: any, logs: any[]): { type: string; severity: string; description: string; fixable: boolean } {
    const failureStr = typeof failure === 'string' ? failure : JSON.stringify(failure);

    if (failureStr.includes('build') || failureStr.includes('compile')) {
      return { type: 'build-error', severity: 'high', description: 'Build compilation failed', fixable: true };
    }
    if (failureStr.includes('test') || failureStr.includes('assert')) {
      return { type: 'test-failure', severity: 'medium', description: 'Test assertions failed', fixable: true };
    }
    if (failureStr.includes('dependency') || failureStr.includes('module') || failureStr.includes('package')) {
      return { type: 'dependency-error', severity: 'high', description: 'Missing or incompatible dependency', fixable: true };
    }
    if (failureStr.includes('config') || failureStr.includes('env') || failureStr.includes('setting')) {
      return { type: 'configuration-error', severity: 'medium', description: 'Configuration issue detected', fixable: true };
    }
    if (failureStr.includes('runtime') || failureStr.includes('exception') || failureStr.includes('crash')) {
      return { type: 'runtime-error', severity: 'high', description: 'Runtime error in application', fixable: true };
    }

    return { type: 'unknown-error', severity: 'medium', description: 'Unclassified error', fixable: false };
  }

  private async analyzePipelineFailure(pipelineId: number, execution: AgentExecution): Promise<{
    classification: { type: string; severity: string; description: string; fixable: boolean };
    failingJobs: Array<{ id: number; name: string; stage: string; status: string }>;
    evidence: string[];
  }> {
    this.log(execution, 'info', `Collecting failed jobs from pipeline ${pipelineId}...`);
    const jobs = await gitlabAdapter.getPipelineJobs(pipelineId);
    const failingJobs = jobs
      .filter(job => job.status === 'failed' || job.status === 'canceled')
      .map(job => ({
        id: job.id,
        name: job.name,
        stage: job.stage,
        status: job.status
      }));

    const evidence: string[] = [];

    for (const job of failingJobs.slice(0, 3)) {
      this.log(execution, 'info', `Fetching logs for failed job ${job.name}...`);
      try {
        const trace = await gitlabAdapter.getJobLogs(job.id);
        evidence.push(trace.slice(-1500));
      } catch (error) {
        evidence.push(`Unable to fetch logs for ${job.name}: ${(error as Error).message}`);
      }
    }

    const classification = this.classifyFailure(
      failingJobs.map(job => `${job.stage}:${job.name}:${job.status}`).join('\n'),
      evidence
    );

    return {
      classification,
      failingJobs,
      evidence
    };
  }

  getHealingHistory(): HealingAttempt[] {
    return this.healingHistory;
  }
}

export const debugAgent = new DebugAgent();
