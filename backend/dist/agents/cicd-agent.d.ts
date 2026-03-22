import { BaseAgent } from './base-agent';
import { AgentExecution } from '../services/types';
export declare class CICDAgent extends BaseAgent {
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private triggerPipeline;
    private monitorPipeline;
    private fetchResults;
    private runTests;
}
export declare const cicdAgent: CICDAgent;
//# sourceMappingURL=cicd-agent.d.ts.map