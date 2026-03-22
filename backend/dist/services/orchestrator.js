"use strict";
// ============================================================
// Orbit DevOps - Flow Orchestrator (Phase 3 Core)
// Real multi-agent orchestration with self-healing
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
exports.flowOrchestrator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const types_1 = require("./types");
const agents_1 = require("../agents");
const debug_agent_1 = require("../agents/debug-agent");
class FlowOrchestrator {
    constructor() {
        this.executions = new Map();
    }
    mergeExecutionOutput(execution, output) {
        if (!output) {
            return;
        }
        execution.result = execution.result || { success: true, output: {} };
        execution.result.output = {
            ...(execution.result.output || {}),
            ...output
        };
        const pipelines = output.pipelines || [];
        const latestPipeline = output.latestPipeline || pipelines[pipelines.length - 1];
        if (pipelines.length > 0) {
            execution.pipelines = [...(execution.pipelines || []), ...pipelines];
            execution.result.pipelines = execution.pipelines;
        }
        if (latestPipeline) {
            execution.latestPipeline = latestPipeline;
            execution.result.latestPipeline = latestPipeline;
        }
    }
    /**
     * Create a structured log entry
     */
    createLog(message, level = 'info', agent) {
        return {
            timestamp: new Date().toISOString(),
            level,
            agent,
            message
        };
    }
    /**
     * Execute a flow by name with parameters
     */
    async executeFlow(executionId, flowName, parameters) {
        console.log(`[Orchestrator] Starting flow: ${flowName} (${executionId})`);
        const execution = {
            id: executionId,
            flowName,
            status: types_1.FlowStatus.RUNNING,
            parameters,
            startTime: new Date().toISOString(),
            logs: [],
            progress: [],
            retryCount: 0
        };
        this.executions.set(executionId, execution);
        try {
            // Load flow definition
            const flowDef = await this.loadFlowDefinition(flowName);
            if (!flowDef) {
                // If no YAML definition, use built-in flow logic
                return await this.executeBuiltInFlow(executionId, flowName, parameters, execution);
            }
            // Execute stages from YAML definition
            for (const stage of flowDef.stages) {
                // Check conditions
                if (stage.condition && !this.evaluateCondition(stage.condition, execution)) {
                    execution.progress.push({
                        stage: stage.name,
                        agent: stage.agent,
                        status: 'skipped',
                        message: `Condition not met: ${stage.condition}`,
                        timestamp: new Date().toISOString()
                    });
                    execution.logs.push(this.createLog(`Skipping stage: ${stage.name} (condition: ${stage.condition})`, 'info'));
                    continue;
                }
                // Check dependencies
                if (stage.depends_on) {
                    const deps = Array.isArray(stage.depends_on) ? stage.depends_on : [stage.depends_on];
                    const allDepsComplete = deps.every(dep => {
                        const depStep = execution.progress.find(p => p.stage === dep);
                        return depStep && (depStep.status === 'completed' || depStep.status === 'skipped');
                    });
                    if (!allDepsComplete) {
                        execution.logs.push(this.createLog(`Waiting for dependencies: ${deps.join(', ')}`, 'info'));
                    }
                }
                const step = {
                    stage: stage.name,
                    agent: stage.agent,
                    status: 'running',
                    timestamp: new Date().toISOString()
                };
                execution.progress.push(step);
                execution.logs.push(this.createLog(`Starting stage: ${stage.name}`, 'info', stage.agent));
                try {
                    await this.executeStage(stage, parameters, execution);
                    step.status = 'completed';
                    step.duration = Date.now() - new Date(step.timestamp).getTime();
                    execution.logs.push(this.createLog(`Completed stage: ${stage.name}`, 'info', stage.agent));
                }
                catch (error) {
                    step.status = 'failed';
                    step.message = error.message;
                    execution.logs.push(this.createLog(`Failed stage: ${stage.name} - ${error.message}`, 'error', stage.agent));
                    // Self-healing: try to recover
                    const recovered = await this.attemptRecovery(execution, stage, error, parameters);
                    if (recovered) {
                        step.status = 'completed';
                        step.message = 'Recovered after self-healing';
                        execution.logs.push(this.createLog(`Stage ${stage.name} recovered via self-healing`, 'info', 'debug-agent'));
                    }
                    else {
                        throw error;
                    }
                }
            }
            execution.status = types_1.FlowStatus.COMPLETED;
            execution.endTime = new Date().toISOString();
            execution.result = {
                success: true,
                message: 'All steps completed successfully',
                userMessage: this.getUserMessage(flowName, true),
                output: {
                    ...(execution.result?.output || {}),
                    parameters
                },
                latestPipeline: execution.latestPipeline,
                pipelines: execution.pipelines
            };
            return execution.result;
        }
        catch (error) {
            execution.status = types_1.FlowStatus.FAILED;
            execution.endTime = new Date().toISOString();
            execution.error = error.message;
            execution.logs.push(this.createLog(`Flow failed: ${error.message}`, 'error'));
            execution.result = {
                success: false,
                message: error.message,
                userMessage: this.getUserMessage(flowName, false, error.message),
                output: execution.result?.output,
                latestPipeline: execution.latestPipeline,
                pipelines: execution.pipelines
            };
            return execution.result;
        }
    }
    /**
     * Execute built-in flows when no YAML definition exists
     */
    async executeBuiltInFlow(executionId, flowName, parameters, execution) {
        execution.logs.push(this.createLog(`Using built-in flow: ${flowName}`));
        switch (flowName) {
            case 'deploy-flow':
                return this.runDeployFlow(execution, parameters);
            case 'build-flow':
                return this.runBuildFlow(execution, parameters);
            case 'debug-flow':
                return this.runDebugFlow(execution, parameters);
            case 'update-flow':
                return this.runUpdateFlow(execution, parameters);
            case 'test-flow':
                return this.runTestFlow(execution, parameters);
            case 'multi-agent-flow':
                return this.runMultiAgentFlow(execution, parameters);
            case 'rollback-flow':
                return this.runRollbackFlow(execution, parameters);
            default:
                return this.runDeployFlow(execution, parameters);
        }
    }
    /**
     * Deploy flow: validate -> build -> test -> security -> deploy -> verify
     */
    async runDeployFlow(execution, params) {
        const stages = [
            { name: 'Preparing deployment', agent: types_1.AgentType.CODE, action: 'validate' },
            { name: 'Building application', agent: types_1.AgentType.CICD, action: 'trigger' },
            { name: 'Security check', agent: types_1.AgentType.SECURITY, action: 'full-scan' },
            { name: 'Deploying to environment', agent: types_1.AgentType.DEPLOY, action: 'deploy' },
            { name: 'Verifying deployment', agent: types_1.AgentType.DEPLOY, action: 'verify' }
        ];
        return this.runStages(execution, stages, params);
    }
    /**
     * Build flow: analyze -> generate code -> test -> save
     */
    async runBuildFlow(execution, params) {
        const stages = [
            { name: 'Analyzing requirements', agent: types_1.AgentType.CODE, action: 'analyze' },
            { name: 'Generating code', agent: types_1.AgentType.CODE, action: 'generate' },
            { name: 'Running tests', agent: types_1.AgentType.CICD, action: 'test' },
            { name: 'Saving changes', agent: types_1.AgentType.GIT, action: 'commit' }
        ];
        return this.runStages(execution, stages, params);
    }
    /**
     * Debug flow: analyze -> identify -> fix -> retry
     */
    async runDebugFlow(execution, params) {
        const stages = [
            { name: 'Analyzing the issue', agent: types_1.AgentType.DEBUG, action: 'analyze' },
            { name: 'Finding root cause', agent: types_1.AgentType.DEBUG, action: 'identify' },
            { name: 'Applying fix', agent: types_1.AgentType.DEBUG, action: 'fix' },
            { name: 'Verifying fix', agent: types_1.AgentType.CICD, action: 'test' },
            { name: 'Saving fix', agent: types_1.AgentType.GIT, action: 'commit' }
        ];
        return this.runStages(execution, stages, params);
    }
    /**
     * Update flow: modify code -> test -> save -> optionally deploy
     */
    async runUpdateFlow(execution, params) {
        const stages = [
            { name: 'Preparing changes', agent: types_1.AgentType.GIT, action: 'create-branch' },
            { name: 'Modifying code', agent: types_1.AgentType.CODE, action: 'modify' },
            { name: 'Running tests', agent: types_1.AgentType.CICD, action: 'test' },
            { name: 'Saving changes', agent: types_1.AgentType.GIT, action: 'commit' }
        ];
        if (params.includeDeployment) {
            stages.push({ name: 'Deploying changes', agent: types_1.AgentType.DEPLOY, action: 'deploy' });
        }
        return this.runStages(execution, stages, params);
    }
    /**
     * Test flow: run tests -> report
     */
    async runTestFlow(execution, params) {
        const stages = [
            { name: 'Running tests', agent: types_1.AgentType.CICD, action: 'test' },
            { name: 'Collecting results', agent: types_1.AgentType.CICD, action: 'results' }
        ];
        return this.runStages(execution, stages, params);
    }
    /**
     * Multi-agent flow: code -> git -> cicd -> debug (if needed) -> deploy
     */
    async runMultiAgentFlow(execution, params) {
        const stages = [
            { name: 'Generating code', agent: types_1.AgentType.CODE, action: 'generate' },
            { name: 'Creating version', agent: types_1.AgentType.GIT, action: 'create-branch' },
            { name: 'Saving changes', agent: types_1.AgentType.GIT, action: 'commit' },
            { name: 'Building & testing', agent: types_1.AgentType.CICD, action: 'trigger' },
            { name: 'Security scan', agent: types_1.AgentType.SECURITY, action: 'full-scan' },
            { name: 'Deploying', agent: types_1.AgentType.DEPLOY, action: 'deploy' },
            { name: 'Verifying', agent: types_1.AgentType.DEPLOY, action: 'verify' }
        ];
        return this.runStages(execution, stages, params);
    }
    /**
     * Rollback flow
     */
    async runRollbackFlow(execution, params) {
        const stages = [
            { name: 'Preparing rollback', agent: types_1.AgentType.DEPLOY, action: 'rollback' },
            { name: 'Verifying rollback', agent: types_1.AgentType.DEPLOY, action: 'verify' }
        ];
        return this.runStages(execution, stages, params);
    }
    /**
     * Generic stage runner - executes stages through real agents
     */
    async runStages(execution, stages, params) {
        for (const stageDef of stages) {
            const step = {
                stage: stageDef.name,
                agent: stageDef.agent,
                status: 'running',
                timestamp: new Date().toISOString()
            };
            execution.progress.push(step);
            execution.logs.push(this.createLog(`Starting: ${stageDef.name}`, 'info', stageDef.agent));
            try {
                const agent = (0, agents_1.getAgent)(stageDef.agent);
                if (!agent) {
                    throw new Error(`Agent not found: ${stageDef.agent}`);
                }
                const result = await agent.execute({ ...params, action: stageDef.action });
                // Merge agent logs into execution logs
                for (const log of result.logs) {
                    execution.logs.push(log);
                }
                if (result.status === 'failed') {
                    throw new Error(result.error || `${stageDef.name} failed`);
                }
                this.mergeExecutionOutput(execution, result.output);
                step.status = 'completed';
                step.duration = Date.now() - new Date(step.timestamp).getTime();
                step.message = result.output?.userMessage || `${stageDef.name} completed`;
                execution.logs.push(this.createLog(`Completed: ${stageDef.name}`, 'info', stageDef.agent));
            }
            catch (error) {
                step.status = 'failed';
                step.message = error.message;
                execution.logs.push(this.createLog(`Failed: ${stageDef.name} - ${error.message}`, 'error', stageDef.agent));
                // Attempt self-healing
                const recovered = await this.attemptRecovery(execution, stageDef, error, params);
                if (recovered) {
                    step.status = 'completed';
                    step.message = 'Recovered via self-healing';
                }
                else {
                    execution.status = types_1.FlowStatus.FAILED;
                    execution.endTime = new Date().toISOString();
                    execution.error = error.message;
                    execution.result = {
                        success: false,
                        message: error.message,
                        userMessage: `Something went wrong during "${stageDef.name}". ${error.message}`,
                        output: execution.result?.output,
                        latestPipeline: execution.latestPipeline,
                        pipelines: execution.pipelines
                    };
                    return {
                        success: false,
                        message: error.message,
                        userMessage: `Something went wrong during "${stageDef.name}". ${error.message}`,
                        output: execution.result?.output,
                        latestPipeline: execution.latestPipeline,
                        pipelines: execution.pipelines
                    };
                }
            }
        }
        execution.status = types_1.FlowStatus.COMPLETED;
        execution.endTime = new Date().toISOString();
        execution.result = {
            success: true,
            message: 'All stages completed successfully',
            userMessage: this.getUserMessage(execution.flowName, true),
            output: execution.result?.output,
            latestPipeline: execution.latestPipeline,
            pipelines: execution.pipelines
        };
        return execution.result;
    }
    /**
     * Execute a stage from YAML flow definition through the appropriate agent
     */
    async executeStage(stage, parameters, execution) {
        const agentType = (0, agents_1.resolveAgentType)(stage.agent);
        if (!agentType) {
            execution.logs.push(this.createLog(`Unknown agent: ${stage.agent}, using generic execution`, 'warn'));
            await this.genericStageExecution(stage, execution);
            return;
        }
        const agent = (0, agents_1.getAgent)(agentType);
        if (!agent) {
            throw new Error(`Agent not available: ${stage.agent}`);
        }
        // Execute each step in the stage
        for (const step of stage.steps || []) {
            const result = await agent.execute({
                ...parameters,
                action: step.action,
                ...step
            });
            // Merge agent logs
            for (const log of result.logs) {
                execution.logs.push(log);
            }
            this.mergeExecutionOutput(execution, result.output);
            if (result.status === 'failed') {
                throw new Error(result.error || `Step ${step.name} failed`);
            }
        }
    }
    /**
     * Self-healing: attempt to recover from a failure (Phase 5)
     */
    async attemptRecovery(execution, stage, error, parameters) {
        const maxRetries = 2;
        execution.retryCount = (execution.retryCount || 0);
        if (execution.retryCount >= maxRetries) {
            execution.logs.push(this.createLog(`Max retry attempts (${maxRetries}) reached. Cannot recover.`, 'error', 'debug-agent'));
            return false;
        }
        execution.retryCount++;
        execution.status = types_1.FlowStatus.RETRYING;
        execution.logs.push(this.createLog(`Attempting self-healing (attempt ${execution.retryCount}/${maxRetries})...`, 'info', 'debug-agent'));
        try {
            const healResult = await debug_agent_1.debugAgent.execute({
                action: 'full-heal',
                failure: error.message,
                stage: stage.name || stage,
                parameters,
                attemptNumber: execution.retryCount
            });
            for (const log of healResult.logs) {
                execution.logs.push(log);
            }
            if (healResult.output?.healed) {
                execution.logs.push(this.createLog('Self-healing successful!', 'info', 'debug-agent'));
                return true;
            }
            return false;
        }
        catch (healError) {
            execution.logs.push(this.createLog(`Self-healing failed: ${healError.message}`, 'error', 'debug-agent'));
            return false;
        }
    }
    /**
     * Generic stage execution for unknown agents
     */
    async genericStageExecution(stage, execution) {
        execution.logs.push(this.createLog(`Executing generic stage: ${stage.name}`));
        for (const step of stage.steps || []) {
            execution.logs.push(this.createLog(`  Step: ${step.name}`));
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    /**
     * Evaluate a condition string against execution state
     */
    evaluateCondition(condition, execution) {
        switch (condition) {
            case 'pipeline_failed':
                return execution.progress.some(p => p.status === 'failed');
            case 'all_passed':
                return execution.progress.every(p => p.status === 'completed' || p.status === 'skipped');
            case 'has_failures':
                return execution.progress.some(p => p.status === 'failed');
            default:
                return true;
        }
    }
    /**
     * Get user-friendly message based on flow outcome
     */
    getUserMessage(flowName, success, error) {
        if (success) {
            switch (flowName) {
                case 'deploy-flow': return 'Your app has been deployed successfully! 🚀';
                case 'build-flow': return 'Your app has been built and is ready! ✅';
                case 'debug-flow': return 'The issue has been found and fixed! 🔧';
                case 'update-flow': return 'Your changes have been applied successfully! ✏️';
                case 'test-flow': return 'All tests passed! ✅';
                case 'multi-agent-flow': return 'Everything is done! Code generated, tested, and deployed! 🎉';
                case 'rollback-flow': return 'Successfully rolled back to the previous version! ⏪';
                default: return 'Operation completed successfully! ✅';
            }
        }
        else {
            return `Something went wrong: ${error || 'Unknown error'}. Check the activity log for details.`;
        }
    }
    /**
     * Load a flow definition from YAML
     */
    async loadFlowDefinition(flowName) {
        const flowFileName = flowName.endsWith('.yaml') ? flowName : flowName + '.yaml';
        // Try multiple paths
        const possiblePaths = [
            path.join(process.cwd(), 'flows', flowFileName),
            path.join(process.cwd(), '..', 'flows', flowFileName),
            path.join(__dirname, '..', '..', 'flows', flowFileName)
        ];
        for (const filePath of possiblePaths) {
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    return yaml.load(content);
                }
            }
            catch (error) {
                // Try next path
            }
        }
        // No YAML found - will use built-in flow
        return null;
    }
    /**
     * Get execution by ID
     */
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    /**
     * Get all executions
     */
    getAllExecutions() {
        return Array.from(this.executions.values())
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }
}
exports.flowOrchestrator = new FlowOrchestrator();
//# sourceMappingURL=orchestrator.js.map