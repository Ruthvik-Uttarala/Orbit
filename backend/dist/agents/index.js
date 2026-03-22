"use strict";
// ============================================================
// Orbit DevOps - Agent Registry
// Central registry for all agent instances
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = exports.securityAgent = exports.deployAgent = exports.debugAgent = exports.cicdAgent = exports.gitAgent = exports.codeAgent = void 0;
exports.getAgent = getAgent;
exports.getAllAgents = getAllAgents;
exports.getAgentDefinitions = getAgentDefinitions;
exports.resolveAgentType = resolveAgentType;
const types_1 = require("../services/types");
const code_agent_1 = require("./code-agent");
Object.defineProperty(exports, "codeAgent", { enumerable: true, get: function () { return code_agent_1.codeAgent; } });
const git_agent_1 = require("./git-agent");
Object.defineProperty(exports, "gitAgent", { enumerable: true, get: function () { return git_agent_1.gitAgent; } });
const cicd_agent_1 = require("./cicd-agent");
Object.defineProperty(exports, "cicdAgent", { enumerable: true, get: function () { return cicd_agent_1.cicdAgent; } });
const debug_agent_1 = require("./debug-agent");
Object.defineProperty(exports, "debugAgent", { enumerable: true, get: function () { return debug_agent_1.debugAgent; } });
const deploy_agent_1 = require("./deploy-agent");
Object.defineProperty(exports, "deployAgent", { enumerable: true, get: function () { return deploy_agent_1.deployAgent; } });
const security_agent_1 = require("./security-agent");
Object.defineProperty(exports, "securityAgent", { enumerable: true, get: function () { return security_agent_1.securityAgent; } });
// Agent registry map
const agentRegistry = new Map();
agentRegistry.set(types_1.AgentType.CODE, code_agent_1.codeAgent);
agentRegistry.set(types_1.AgentType.GIT, git_agent_1.gitAgent);
agentRegistry.set(types_1.AgentType.CICD, cicd_agent_1.cicdAgent);
agentRegistry.set(types_1.AgentType.DEBUG, debug_agent_1.debugAgent);
agentRegistry.set(types_1.AgentType.DEPLOY, deploy_agent_1.deployAgent);
agentRegistry.set(types_1.AgentType.SECURITY, security_agent_1.securityAgent);
/**
 * Get an agent by type
 */
function getAgent(type) {
    return agentRegistry.get(type);
}
/**
 * Get all registered agents
 */
function getAllAgents() {
    return Array.from(agentRegistry.values());
}
/**
 * Get all agent definitions for API responses
 */
function getAgentDefinitions() {
    return getAllAgents().map(agent => agent.getDefinition());
}
/**
 * Resolve agent type from string name
 */
function resolveAgentType(name) {
    // Direct match
    const directMatch = Object.values(types_1.AgentType).find(t => t === name);
    if (directMatch)
        return directMatch;
    // Fuzzy match
    const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
    const mappings = {
        'code': types_1.AgentType.CODE,
        'codeagent': types_1.AgentType.CODE,
        'git': types_1.AgentType.GIT,
        'gitagent': types_1.AgentType.GIT,
        'versioncontrol': types_1.AgentType.GIT,
        'cicd': types_1.AgentType.CICD,
        'cicdagent': types_1.AgentType.CICD,
        'pipeline': types_1.AgentType.CICD,
        'build': types_1.AgentType.CICD,
        'debug': types_1.AgentType.DEBUG,
        'debugagent': types_1.AgentType.DEBUG,
        'fix': types_1.AgentType.DEBUG,
        'deploy': types_1.AgentType.DEPLOY,
        'deployagent': types_1.AgentType.DEPLOY,
        'deployment': types_1.AgentType.DEPLOY,
        'orbitdeployagent': types_1.AgentType.DEPLOY,
        'security': types_1.AgentType.SECURITY,
        'securityagent': types_1.AgentType.SECURITY,
        'scan': types_1.AgentType.SECURITY
    };
    return mappings[normalized];
}
var base_agent_1 = require("./base-agent");
Object.defineProperty(exports, "BaseAgent", { enumerable: true, get: function () { return base_agent_1.BaseAgent; } });
//# sourceMappingURL=index.js.map