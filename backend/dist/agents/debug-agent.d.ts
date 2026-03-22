import { BaseAgent } from './base-agent';
import { AgentExecution, HealingAttempt } from '../services/types';
export declare class DebugAgent extends BaseAgent {
    private healingHistory;
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private analyzeFailure;
    private identifyRootCause;
    private applyFix;
    private retryWithFix;
    /**
     * Full self-healing cycle (Phase 5 core)
     * Detect -> Classify -> Identify -> Fix -> Retry
     */
    fullHealingCycle(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private classifyFailure;
    getHealingHistory(): HealingAttempt[];
}
export declare const debugAgent: DebugAgent;
//# sourceMappingURL=debug-agent.d.ts.map