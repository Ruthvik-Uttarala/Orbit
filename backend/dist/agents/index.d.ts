import { AgentType } from '../services/types';
import { BaseAgent } from './base-agent';
import { codeAgent } from './code-agent';
import { gitAgent } from './git-agent';
import { cicdAgent } from './cicd-agent';
import { debugAgent } from './debug-agent';
import { deployAgent } from './deploy-agent';
import { securityAgent } from './security-agent';
/**
 * Get an agent by type
 */
export declare function getAgent(type: AgentType): BaseAgent | undefined;
/**
 * Get all registered agents
 */
export declare function getAllAgents(): BaseAgent[];
/**
 * Get all agent definitions for API responses
 */
export declare function getAgentDefinitions(): {
    type: AgentType;
    name: string;
    description: string;
    capabilities: string[];
    status: "available";
}[];
/**
 * Resolve agent type from string name
 */
export declare function resolveAgentType(name: string): AgentType | undefined;
export { codeAgent, gitAgent, cicdAgent, debugAgent, deployAgent, securityAgent };
export { BaseAgent } from './base-agent';
//# sourceMappingURL=index.d.ts.map