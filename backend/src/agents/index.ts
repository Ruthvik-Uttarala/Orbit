// ============================================================
// Orbit DevOps - Agent Registry
// Central registry for all agent instances
// ============================================================

import { AgentType } from '../services/types';
import { BaseAgent } from './base-agent';
import { codeAgent } from './code-agent';
import { gitAgent } from './git-agent';
import { cicdAgent } from './cicd-agent';
import { debugAgent } from './debug-agent';
import { deployAgent } from './deploy-agent';
import { securityAgent } from './security-agent';

// Agent registry map
const agentRegistry = new Map<AgentType, BaseAgent>();
agentRegistry.set(AgentType.CODE, codeAgent);
agentRegistry.set(AgentType.GIT, gitAgent);
agentRegistry.set(AgentType.CICD, cicdAgent);
agentRegistry.set(AgentType.DEBUG, debugAgent);
agentRegistry.set(AgentType.DEPLOY, deployAgent);
agentRegistry.set(AgentType.SECURITY, securityAgent);

/**
 * Get an agent by type
 */
export function getAgent(type: AgentType): BaseAgent | undefined {
  return agentRegistry.get(type);
}

/**
 * Get all registered agents
 */
export function getAllAgents(): BaseAgent[] {
  return Array.from(agentRegistry.values());
}

/**
 * Get all agent definitions for API responses
 */
export function getAgentDefinitions() {
  return getAllAgents().map(agent => agent.getDefinition());
}

/**
 * Resolve agent type from string name
 */
export function resolveAgentType(name: string): AgentType | undefined {
  // Direct match
  const directMatch = Object.values(AgentType).find(t => t === name);
  if (directMatch) return directMatch;

  // Fuzzy match
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  const mappings: Record<string, AgentType> = {
    'code': AgentType.CODE,
    'codeagent': AgentType.CODE,
    'git': AgentType.GIT,
    'gitagent': AgentType.GIT,
    'versioncontrol': AgentType.GIT,
    'cicd': AgentType.CICD,
    'cicdagent': AgentType.CICD,
    'pipeline': AgentType.CICD,
    'build': AgentType.CICD,
    'debug': AgentType.DEBUG,
    'debugagent': AgentType.DEBUG,
    'fix': AgentType.DEBUG,
    'deploy': AgentType.DEPLOY,
    'deployagent': AgentType.DEPLOY,
    'deployment': AgentType.DEPLOY,
    'orbitdeployagent': AgentType.DEPLOY,
    'security': AgentType.SECURITY,
    'securityagent': AgentType.SECURITY,
    'scan': AgentType.SECURITY
  };

  return mappings[normalized];
}

// Re-export individual agents
export { codeAgent, gitAgent, cicdAgent, debugAgent, deployAgent, securityAgent };
export { BaseAgent } from './base-agent';
