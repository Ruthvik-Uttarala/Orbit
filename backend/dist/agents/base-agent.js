"use strict";
// ============================================================
// Orbit DevOps - Base Agent Class
// All agents extend this for consistent behavior
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const types_1 = require("../services/types");
const uuid_1 = require("uuid");
class BaseAgent {
    constructor(type, name, description, capabilities) {
        this.type = type;
        this.name = name;
        this.description = description;
        this.capabilities = capabilities;
    }
    /**
     * Execute the agent's task
     */
    async execute(input) {
        const execution = {
            id: (0, uuid_1.v4)(),
            agentType: this.type,
            status: types_1.AgentStatus.RUNNING,
            input,
            startTime: new Date().toISOString(),
            logs: []
        };
        this.log(execution, 'info', `${this.name} starting execution`);
        try {
            const output = await this.run(input, execution);
            execution.status = types_1.AgentStatus.COMPLETED;
            execution.output = output;
            execution.endTime = new Date().toISOString();
            this.log(execution, 'info', `${this.name} completed successfully`);
        }
        catch (error) {
            execution.status = types_1.AgentStatus.FAILED;
            execution.error = error.message;
            execution.endTime = new Date().toISOString();
            this.log(execution, 'error', `${this.name} failed: ${error.message}`);
        }
        return execution;
    }
    /**
     * Add a structured log entry
     */
    log(execution, level, message, detail) {
        execution.logs.push({
            timestamp: new Date().toISOString(),
            level,
            agent: this.type,
            message,
            detail
        });
    }
    /**
     * Simulate async work with realistic timing
     */
    async work(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get agent definition for API responses
     */
    getDefinition() {
        return {
            type: this.type,
            name: this.name,
            description: this.description,
            capabilities: this.capabilities,
            status: 'available'
        };
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=base-agent.js.map