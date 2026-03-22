import { BaseAgent } from './base-agent';
import { AgentExecution } from '../services/types';
export declare class SecurityAgent extends BaseAgent {
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private scanDependencies;
    private scanCode;
    private checkSecrets;
    private complianceCheck;
    private fullScan;
}
export declare const securityAgent: SecurityAgent;
//# sourceMappingURL=security-agent.d.ts.map