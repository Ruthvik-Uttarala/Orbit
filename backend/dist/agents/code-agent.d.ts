import { BaseAgent } from './base-agent';
import { AgentExecution } from '../services/types';
export declare class CodeAgent extends BaseAgent {
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private analyzeRequirements;
    private generateCode;
    private generateTests;
    private validateCode;
    private modifyCode;
}
export declare const codeAgent: CodeAgent;
//# sourceMappingURL=code-agent.d.ts.map