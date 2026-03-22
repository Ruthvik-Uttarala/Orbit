"use strict";
// ============================================================
// Orbit DevOps - Core Type Definitions
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentType = exports.AgentStatus = exports.AgentType = exports.FlowStatus = void 0;
// Flow execution status
var FlowStatus;
(function (FlowStatus) {
    FlowStatus["PENDING"] = "pending";
    FlowStatus["RUNNING"] = "running";
    FlowStatus["COMPLETED"] = "completed";
    FlowStatus["FAILED"] = "failed";
    FlowStatus["CANCELLED"] = "cancelled";
    FlowStatus["RETRYING"] = "retrying";
})(FlowStatus || (exports.FlowStatus = FlowStatus = {}));
// Agent types
var AgentType;
(function (AgentType) {
    AgentType["CODE"] = "code-agent";
    AgentType["GIT"] = "git-agent";
    AgentType["CICD"] = "cicd-agent";
    AgentType["DEBUG"] = "debug-agent";
    AgentType["DEPLOY"] = "deploy-agent";
    AgentType["SECURITY"] = "security-agent";
})(AgentType || (exports.AgentType = AgentType = {}));
// Agent status
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "idle";
    AgentStatus["RUNNING"] = "running";
    AgentStatus["COMPLETED"] = "completed";
    AgentStatus["FAILED"] = "failed";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
// Intent types recognized by the system
var IntentType;
(function (IntentType) {
    IntentType["DEPLOY"] = "deploy";
    IntentType["BUILD"] = "build";
    IntentType["FIX"] = "fix";
    IntentType["UPDATE"] = "update";
    IntentType["CREATE"] = "create";
    IntentType["TEST"] = "test";
    IntentType["ROLLBACK"] = "rollback";
    IntentType["STATUS"] = "status";
    IntentType["UNKNOWN"] = "unknown";
})(IntentType || (exports.IntentType = IntentType = {}));
//# sourceMappingURL=types.js.map