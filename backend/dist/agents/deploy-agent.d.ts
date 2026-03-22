import { BaseAgent } from './base-agent';
import { AgentExecution } from '../services/types';
export declare class DeployAgent extends BaseAgent {
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private deploy;
    private verifyDeployment;
    private rollback;
    private healthCheck;
}
export declare const deployAgent: DeployAgent;
//# sourceMappingURL=deploy-agent.d.ts.map