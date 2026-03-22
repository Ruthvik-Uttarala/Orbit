import { BaseAgent } from './base-agent';
import { AgentExecution, HealingAttempt } from '../services/types';
export declare class DebugAgent extends BaseAgent {
    private healingHistory;
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private getRepoRoot;
    private getHealingWorkspace;
    private writeHealingArtifact;
    private analyzeFailure;
    private identifyRootCause;
    private gatherContext;
    private suggestFix;
    private applyFix;
    private validateFix;
    private retryWithFix;
    /**
     * Full self-healing cycle (Phase 5 core)
     * Detect -> Classify -> Identify -> Fix -> Retry
     */
    fullHealingCycle(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private classifyFailure;
    private analyzePipelineFailure;
    getHealingHistory(): HealingAttempt[];
}
export declare const debugAgent: DebugAgent;
//# sourceMappingURL=debug-agent.d.ts.map