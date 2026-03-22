import { AgentType, AgentExecution, LogEntry } from '../services/types';
export declare abstract class BaseAgent {
    readonly type: AgentType;
    readonly name: string;
    readonly description: string;
    readonly capabilities: string[];
    constructor(type: AgentType, name: string, description: string, capabilities: string[]);
    /**
     * Execute the agent's task
     */
    execute(input: Record<string, any>): Promise<AgentExecution>;
    /**
     * Abstract method - each agent implements its own logic
     */
    protected abstract run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    /**
     * Add a structured log entry
     */
    protected log(execution: AgentExecution, level: LogEntry['level'], message: string, detail?: string): void;
    /**
     * Simulate async work with realistic timing
     */
    protected work(ms: number): Promise<void>;
    /**
     * Get agent definition for API responses
     */
    getDefinition(): {
        type: AgentType;
        name: string;
        description: string;
        capabilities: string[];
        status: "available";
    };
}
//# sourceMappingURL=base-agent.d.ts.map