import { FlowExecution, FlowResult } from './types';
declare class FlowOrchestrator {
    private executions;
    /**
     * Create a structured log entry
     */
    private createLog;
    /**
     * Execute a flow by name with parameters
     */
    executeFlow(executionId: string, flowName: string, parameters: Record<string, any>): Promise<FlowResult>;
    /**
     * Execute built-in flows when no YAML definition exists
     */
    private executeBuiltInFlow;
    /**
     * Deploy flow: validate -> build -> test -> security -> deploy -> verify
     */
    private runDeployFlow;
    /**
     * Build flow: analyze -> generate code -> test -> save
     */
    private runBuildFlow;
    /**
     * Debug flow: analyze -> identify -> fix -> retry
     */
    private runDebugFlow;
    /**
     * Update flow: modify code -> test -> save -> optionally deploy
     */
    private runUpdateFlow;
    /**
     * Test flow: run tests -> report
     */
    private runTestFlow;
    /**
     * Multi-agent flow: code -> git -> cicd -> debug (if needed) -> deploy
     */
    private runMultiAgentFlow;
    /**
     * Rollback flow
     */
    private runRollbackFlow;
    /**
     * Generic stage runner - executes stages through real agents
     */
    private runStages;
    /**
     * Execute a stage from YAML flow definition through the appropriate agent
     */
    private executeStage;
    /**
     * Self-healing: attempt to recover from a failure (Phase 5)
     */
    private attemptRecovery;
    /**
     * Generic stage execution for unknown agents
     */
    private genericStageExecution;
    /**
     * Evaluate a condition string against execution state
     */
    private evaluateCondition;
    /**
     * Get user-friendly message based on flow outcome
     */
    private getUserMessage;
    /**
     * Load a flow definition from YAML
     */
    private loadFlowDefinition;
    /**
     * Get execution by ID
     */
    getExecution(executionId: string): FlowExecution | undefined;
    /**
     * Get all executions
     */
    getAllExecutions(): FlowExecution[];
}
export declare const flowOrchestrator: FlowOrchestrator;
export {};
//# sourceMappingURL=orchestrator.d.ts.map