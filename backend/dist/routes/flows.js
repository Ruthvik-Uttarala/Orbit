"use strict";
// ============================================================
// Orbit DevOps - Flow Routes
// API endpoints for flow execution and management
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowsRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const types_1 = require("../services/types");
const orchestrator_1 = require("../services/orchestrator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
exports.flowsRouter = (0, express_1.Router)();
// Get all flow definitions
exports.flowsRouter.get('/definitions', (_req, res) => {
    try {
        // Try multiple paths for flows directory
        const possiblePaths = [
            path.join(process.cwd(), 'flows'),
            path.join(process.cwd(), '..', 'flows'),
            path.join(__dirname, '..', '..', 'flows')
        ];
        let flowsDir = '';
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                flowsDir = p;
                break;
            }
        }
        if (!flowsDir) {
            res.json({ flows: [] });
            return;
        }
        const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.yaml'));
        const definitions = files.map(file => {
            try {
                const content = fs.readFileSync(path.join(flowsDir, file), 'utf-8');
                const parsed = yaml.load(content);
                return {
                    name: parsed.name,
                    version: parsed.version,
                    description: parsed.description,
                    triggers: parsed.triggers,
                    stages: parsed.stages?.map((s) => s.name) || []
                };
            }
            catch (e) {
                return null;
            }
        }).filter(Boolean);
        res.json({ flows: definitions });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load flow definitions', details: error.message });
    }
});
// Get flow status
exports.flowsRouter.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    const execution = await orchestrator_1.flowOrchestrator.getExecution(id);
    if (!execution) {
        res.status(404).json({ error: 'Flow execution not found' });
        return;
    }
    // Convert logs to plain strings for frontend
    const displayLogs = execution.logs.map(log => {
        if (typeof log === 'string')
            return log;
        return log.message;
    });
    res.json({
        ...execution,
        logs: displayLogs
    });
});
// Get flow logs
exports.flowsRouter.get('/logs/:id', async (req, res) => {
    const { id } = req.params;
    const execution = await orchestrator_1.flowOrchestrator.getExecution(id);
    if (!execution) {
        res.status(404).json({ error: 'Flow execution not found' });
        return;
    }
    const logs = execution.logs.map(log => {
        if (typeof log === 'string')
            return log;
        return log.message;
    });
    res.json({ logs });
});
// Trigger a flow execution
exports.flowsRouter.post('/trigger', async (req, res) => {
    try {
        const { flowName, parameters } = req.body;
        if (!flowName) {
            res.status(400).json({ error: 'flowName is required' });
            return;
        }
        const executionId = (0, uuid_1.v4)();
        const execution = {
            id: executionId,
            flowName,
            status: types_1.FlowStatus.PENDING,
            parameters: parameters || {},
            startTime: new Date().toISOString(),
            logs: [],
            progress: []
        };
        // Start flow execution asynchronously
        orchestrator_1.flowOrchestrator.executeFlow(executionId, flowName, parameters || {})
            .then(result => {
            console.log(`[Flow] ${flowName} completed: ${result.success}`);
        })
            .catch(error => {
            console.error(`[Flow] ${flowName} error:`, error);
        });
        res.status(202).json({
            executionId,
            status: types_1.FlowStatus.PENDING,
            message: 'Flow execution started'
        });
    }
    catch (error) {
        console.error('[Flow] Trigger error:', error);
        res.status(500).json({
            error: 'Failed to trigger flow',
            details: error.message
        });
    }
});
// List all flow executions
exports.flowsRouter.get('/', (_req, res) => {
    const executions = orchestrator_1.flowOrchestrator.getAllExecutions();
    // Convert logs to plain strings
    const displayExecutions = executions.map(exec => ({
        ...exec,
        logs: exec.logs.map(log => typeof log === 'string' ? log : log.message)
    }));
    res.json({ executions: displayExecutions });
});
//# sourceMappingURL=flows.js.map