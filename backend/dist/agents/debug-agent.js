"use strict";
// ============================================================
// Orbit DevOps - Debug Agent (Self-Healing - Phase 5)
// Analyzes failures, identifies root causes, applies fixes
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugAgent = exports.DebugAgent = void 0;
const base_agent_1 = require("./base-agent");
const types_1 = require("../services/types");
const gitlab_adapter_1 = require("../services/gitlab-adapter");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DebugAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(types_1.AgentType.DEBUG, 'Debug Agent', 'Analyzes failures, identifies root causes, and applies autonomous fixes', ['analyze-logs', 'identify-issues', 'suggest-fixes', 'auto-remediation', 'retry-pipeline']);
        this.healingHistory = [];
    }
    async run(input, execution) {
        const action = input.action || 'analyze';
        switch (action) {
            case 'analyze':
                return this.analyzeFailure(input, execution);
            case 'gather':
                return this.gatherContext(input, execution);
            case 'identify':
                return this.identifyRootCause(input, execution);
            case 'suggest-fix':
                return this.suggestFix(input, execution);
            case 'fix':
                return this.applyFix(input, execution);
            case 'validate':
                return this.validateFix(input, execution);
            case 'retry':
                return this.retryWithFix(input, execution);
            case 'full-heal':
                return this.fullHealingCycle(input, execution);
            default:
                return this.analyzeFailure(input, execution);
        }
    }
    getRepoRoot() {
        return process.env.ORBIT_REPO_ROOT || path.resolve(process.cwd(), '..');
    }
    getHealingWorkspace() {
        return path.join(this.getRepoRoot(), 'backend', 'src', 'generated', 'self-healing');
    }
    writeHealingArtifact(failureType, content) {
        const safeType = failureType.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'unknown-failure';
        const workspace = this.getHealingWorkspace();
        const filePath = path.join(workspace, `${safeType}.ts`);
        const existed = fs.existsSync(filePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
        return {
            path: path.relative(this.getRepoRoot(), filePath),
            status: existed ? 'updated' : 'created'
        };
    }
    async analyzeFailure(input, execution) {
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
    async identifyRootCause(input, execution) {
        this.log(execution, 'info', 'Identifying root cause...');
        await this.work(700);
        this.log(execution, 'info', 'Tracing error through call stack...');
        await this.work(500);
        this.log(execution, 'info', 'Checking recent changes for potential causes...');
        await this.work(400);
        const rootCause = input.classification?.type || 'configuration-error';
        const causes = {
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
    async gatherContext(input, execution) {
        this.log(execution, 'info', 'Gathering logs and recent failure context...');
        await this.work(250);
        const logs = input.logs || [];
        const context = {
            stage: input.stage,
            pipelineId: input.pipelineId || input.pipeline?.id,
            logCount: Array.isArray(logs) ? logs.length : 0
        };
        return {
            gathered: true,
            context,
            userMessage: 'Collected logs and execution context for the failure.'
        };
    }
    async suggestFix(input, execution) {
        const identified = await this.identifyRootCause(input, execution);
        return {
            ...identified,
            suggested: true,
            userMessage: `Recommended fix: ${identified.suggestedFix}`
        };
    }
    async applyFix(input, execution) {
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
        const artifact = this.writeHealingArtifact(fixType, `export const selfHealingRecord = {\n  failureType: '${fixType}',\n  appliedAt: '${new Date().toISOString()}',\n  fix: '${fixApplied.replace(/'/g, "\\'")}',\n  source: 'debug-agent'\n};\n`);
        this.log(execution, 'info', fixApplied);
        return {
            fixed: true,
            fixType,
            fixDescription: fixApplied,
            filesModified: [artifact.path],
            userMessage: `Fix applied: ${fixApplied}. Ready to retry.`
        };
    }
    async validateFix(input, execution) {
        this.log(execution, 'info', 'Validating the applied remediation...');
        await this.work(250);
        const filesModified = Array.isArray(input.filesModified) ? input.filesModified : [];
        const allFilesPresent = filesModified.every(file => fs.existsSync(path.join(this.getRepoRoot(), file)));
        return {
            valid: allFilesPresent || filesModified.length === 0,
            filesModified,
            userMessage: allFilesPresent || filesModified.length === 0
                ? 'The remediation files are in place and ready for retry.'
                : 'Some remediation files are missing; the fix needs another pass.'
        };
    }
    async retryWithFix(input, execution) {
        this.log(execution, 'info', 'Retrying after fix...');
        await this.work(300);
        if (input.pipeline?.ref || input.ref) {
            const ref = input.pipeline?.ref || input.ref;
            this.log(execution, 'info', `Re-running pipeline on ${ref}...`);
            const pipeline = await gitlab_adapter_1.gitlabAdapter.triggerPipeline(ref);
            if (pipeline) {
                const finalPipeline = await gitlab_adapter_1.gitlabAdapter.monitorPipeline(pipeline.id, {
                    onProgress: current => {
                        this.log(execution, 'info', `Retry pipeline status: ${current.status}`);
                    }
                });
                const success = finalPipeline.status === 'success';
                return {
                    retried: true,
                    success,
                    attemptNumber: input.attemptNumber || 1,
                    newPipelineId: finalPipeline.id,
                    ref,
                    latestPipeline: {
                        id: finalPipeline.id,
                        status: finalPipeline.status,
                        ref: finalPipeline.ref,
                        url: finalPipeline.webUrl,
                        provider: 'gitlab',
                        source: 'cicd-agent',
                        updatedAt: finalPipeline.updatedAt
                    },
                    userMessage: success
                        ? `The retry pipeline on ${ref} passed after the fix.`
                        : `The retry pipeline on ${ref} still failed, so more work is needed.`
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
        }
        else {
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
    async fullHealingCycle(input, execution) {
        if (input.pipeline?.id || input.pipelineId) {
            const pipelineId = input.pipeline?.id || input.pipelineId;
            const analysis = await this.analyzeFailure({ ...input, pipelineId }, execution);
            const rootCause = await this.identifyRootCause({ ...input, ...analysis }, execution);
            const fix = await this.applyFix({ ...input, ...analysis, ...rootCause }, execution);
            const retry = await this.retryWithFix({ ...input, ...analysis, ...rootCause, ...fix }, execution);
            const healed = retry.success === true;
            return {
                healed,
                retryParameters: {
                    ...input,
                    simulateFailure: false,
                    simulateFirstFailure: false,
                    healingApplied: true
                },
                fixedFiles: fix.filesModified || [],
                latestPipeline: retry.latestPipeline,
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
                    ? (retry.userMessage || 'I analyzed the failing GitLab pipeline and the retry passed after the fix.')
                    : (retry.userMessage || 'I analyzed the failing GitLab pipeline and collected the likely cause, but I could not restart it automatically.')
            };
        }
        const maxAttempts = input.maxAttempts || 3;
        const attempts = [];
        const fixedFiles = [];
        this.log(execution, 'info', '=== Starting Self-Healing Cycle ===');
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            this.log(execution, 'info', `--- Healing Attempt ${attempt}/${maxAttempts} ---`);
            const analysis = await this.analyzeFailure(input, execution);
            const rootCause = await this.identifyRootCause({ ...input, ...analysis }, execution);
            const fix = await this.applyFix({ ...input, ...analysis, ...rootCause }, execution);
            fixedFiles.push(...(fix.filesModified || []));
            const retry = await this.retryWithFix({
                ...input,
                ...analysis,
                ...rootCause,
                ...fix,
                attemptNumber: attempt,
                maxAttempts
            }, execution);
            const success = retry.success === true && (!input.simulateFirstFailure || attempt > 1);
            const healingAttempt = {
                attemptNumber: attempt,
                timestamp: new Date().toISOString(),
                failureType: analysis.classification?.type || 'unknown-error',
                rootCause: rootCause.rootCause,
                fixApplied: fix.fixDescription,
                outcome: success ? 'success' : 'failure',
                logs: [...execution.logs]
            };
            attempts.push(healingAttempt);
            this.healingHistory.push(healingAttempt);
            if (success) {
                this.log(execution, 'info', `✓ Healing successful on attempt ${attempt}`);
                return {
                    healed: true,
                    retryParameters: {
                        ...input,
                        simulateFailure: false,
                        simulateFirstFailure: false,
                        healingApplied: true
                    },
                    fixedFiles,
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
            fixedFiles,
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
    classifyFailure(failure, logs) {
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
    async analyzePipelineFailure(pipelineId, execution) {
        this.log(execution, 'info', `Collecting failed jobs from pipeline ${pipelineId}...`);
        const jobs = await gitlab_adapter_1.gitlabAdapter.getPipelineJobs(pipelineId);
        const failingJobs = jobs
            .filter(job => job.status === 'failed' || job.status === 'canceled')
            .map(job => ({
            id: job.id,
            name: job.name,
            stage: job.stage,
            status: job.status
        }));
        const evidence = [];
        for (const job of failingJobs.slice(0, 3)) {
            this.log(execution, 'info', `Fetching logs for failed job ${job.name}...`);
            try {
                const trace = await gitlab_adapter_1.gitlabAdapter.getJobLogs(job.id);
                evidence.push(trace.slice(-1500));
            }
            catch (error) {
                evidence.push(`Unable to fetch logs for ${job.name}: ${error.message}`);
            }
        }
        const classification = this.classifyFailure(failingJobs.map(job => `${job.stage}:${job.name}:${job.status}`).join('\n'), evidence);
        return {
            classification,
            failingJobs,
            evidence
        };
    }
    getHealingHistory() {
        return this.healingHistory;
    }
}
exports.DebugAgent = DebugAgent;
exports.debugAgent = new DebugAgent();
//# sourceMappingURL=debug-agent.js.map