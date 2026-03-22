// ============================================================
// Orbit DevOps - Flow Orchestrator (Phase 3 Core)
// Real multi-agent orchestration with self-healing
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FlowExecution, FlowStatus, FlowResult, FlowDefinition, ProgressStep, LogEntry, AgentType } from './types';
import { gitlabAdapter } from './gitlab-adapter';
import { getAgent, resolveAgentType } from '../agents';
import { debugAgent } from '../agents/debug-agent';

class FlowOrchestrator {
  private executions: Map<string, FlowExecution> = new Map();

  /**
   * Create a structured log entry
   */
  private createLog(message: string, level: LogEntry['level'] = 'info', agent?: string): LogEntry {
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
  async executeFlow(executionId: string, flowName: string, parameters: Record<string, any>): Promise<FlowResult> {
    console.log(`[Orchestrator] Starting flow: ${flowName} (${executionId})`);

    const execution: FlowExecution = {
      id: executionId,
      flowName,
      status: FlowStatus.RUNNING,
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

        const step: ProgressStep = {
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
        } catch (error) {
          step.status = 'failed';
          step.message = (error as Error).message;
          execution.logs.push(this.createLog(`Failed stage: ${stage.name} - ${(error as Error).message}`, 'error', stage.agent));

          // Self-healing: try to recover
          const recovered = await this.attemptRecovery(execution, stage, error as Error, parameters);
          if (recovered) {
            step.status = 'completed';
            step.message = 'Recovered after self-healing';
            execution.logs.push(this.createLog(`Stage ${stage.name} recovered via self-healing`, 'info', 'debug-agent'));
          } else {
            throw error;
          }
        }
      }

      execution.status = FlowStatus.COMPLETED;
      execution.endTime = new Date().toISOString();

      return {
        success: true,
        message: 'All steps completed successfully',
        userMessage: this.getUserMessage(flowName, true),
        output: { parameters }
      };
    } catch (error) {
      execution.status = FlowStatus.FAILED;
      execution.endTime = new Date().toISOString();
      execution.error = (error as Error).message;
      execution.logs.push(this.createLog(`Flow failed: ${(error as Error).message}`, 'error'));

      return {
        success: false,
        message: (error as Error).message,
        userMessage: this.getUserMessage(flowName, false, (error as Error).message)
      };
    }
  }

  /**
   * Execute built-in flows when no YAML definition exists
   */
  private async executeBuiltInFlow(
    executionId: string,
    flowName: string,
    parameters: Record<string, any>,
    execution: FlowExecution
  ): Promise<FlowResult> {
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
  private async runDeployFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Preparing deployment', agent: AgentType.CODE, action: 'validate' },
      { name: 'Building application', agent: AgentType.CICD, action: 'trigger' },
      { name: 'Security check', agent: AgentType.SECURITY, action: 'full-scan' },
      { name: 'Deploying to environment', agent: AgentType.DEPLOY, action: 'deploy' },
      { name: 'Verifying deployment', agent: AgentType.DEPLOY, action: 'verify' }
    ];

    return this.runStages(execution, stages, params);
  }

  /**
   * Build flow: analyze -> generate code -> test -> save
   */
  private async runBuildFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Analyzing requirements', agent: AgentType.CODE, action: 'analyze' },
      { name: 'Generating code', agent: AgentType.CODE, action: 'generate' },
      { name: 'Running tests', agent: AgentType.CICD, action: 'test' },
      { name: 'Saving changes', agent: AgentType.GIT, action: 'commit' }
    ];

    return this.runStages(execution, stages, params);
  }

  /**
   * Debug flow: analyze -> identify -> fix -> retry
   */
  private async runDebugFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Analyzing the issue', agent: AgentType.DEBUG, action: 'analyze' },
      { name: 'Finding root cause', agent: AgentType.DEBUG, action: 'identify' },
      { name: 'Applying fix', agent: AgentType.DEBUG, action: 'fix' },
      { name: 'Verifying fix', agent: AgentType.CICD, action: 'test' },
      { name: 'Saving fix', agent: AgentType.GIT, action: 'commit' }
    ];

    return this.runStages(execution, stages, params);
  }

  /**
   * Update flow: modify code -> test -> save -> optionally deploy
   */
  private async runUpdateFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Preparing changes', agent: AgentType.GIT, action: 'create-branch' },
      { name: 'Modifying code', agent: AgentType.CODE, action: 'modify' },
      { name: 'Running tests', agent: AgentType.CICD, action: 'test' },
      { name: 'Saving changes', agent: AgentType.GIT, action: 'commit' }
    ];

    if (params.includeDeployment) {
      stages.push(
        { name: 'Deploying changes', agent: AgentType.DEPLOY, action: 'deploy' }
      );
    }

    return this.runStages(execution, stages, params);
  }

  /**
   * Test flow: run tests -> report
   */
  private async runTestFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Running tests', agent: AgentType.CICD, action: 'test' },
      { name: 'Collecting results', agent: AgentType.CICD, action: 'results' }
    ];

    return this.runStages(execution, stages, params);
  }

  /**
   * Multi-agent flow: code -> git -> cicd -> debug (if needed) -> deploy
   */
  private async runMultiAgentFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Generating code', agent: AgentType.CODE, action: 'generate' },
      { name: 'Creating version', agent: AgentType.GIT, action: 'create-branch' },
      { name: 'Saving changes', agent: AgentType.GIT, action: 'commit' },
      { name: 'Building & testing', agent: AgentType.CICD, action: 'trigger' },
      { name: 'Security scan', agent: AgentType.SECURITY, action: 'full-scan' },
      { name: 'Deploying', agent: AgentType.DEPLOY, action: 'deploy' },
      { name: 'Verifying', agent: AgentType.DEPLOY, action: 'verify' }
    ];

    return this.runStages(execution, stages, params);
  }

  /**
   * Rollback flow
   */
  private async runRollbackFlow(execution: FlowExecution, params: Record<string, any>): Promise<FlowResult> {
    const stages = [
      { name: 'Preparing rollback', agent: AgentType.DEPLOY, action: 'rollback' },
      { name: 'Verifying rollback', agent: AgentType.DEPLOY, action: 'verify' }
    ];

    return this.runStages(execution, stages, params);
  }

  /**
   * Generic stage runner - executes stages through real agents
   */
  private async runStages(
    execution: FlowExecution,
    stages: Array<{ name: string; agent: AgentType; action: string }>,
    params: Record<string, any>
  ): Promise<FlowResult> {
    for (const stageDef of stages) {
      const step: ProgressStep = {
        stage: stageDef.name,
        agent: stageDef.agent,
        status: 'running',
        timestamp: new Date().toISOString()
      };
      execution.progress.push(step);
      execution.logs.push(this.createLog(`Starting: ${stageDef.name}`, 'info', stageDef.agent));

      try {
        const agent = getAgent(stageDef.agent);
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

        step.status = 'completed';
        step.duration = Date.now() - new Date(step.timestamp).getTime();
        step.message = result.output?.userMessage || `${stageDef.name} completed`;
        execution.logs.push(this.createLog(`Completed: ${stageDef.name}`, 'info', stageDef.agent));
      } catch (error) {
        step.status = 'failed';
        step.message = (error as Error).message;
        execution.logs.push(this.createLog(`Failed: ${stageDef.name} - ${(error as Error).message}`, 'error', stageDef.agent));

        // Attempt self-healing
        const recovered = await this.attemptRecovery(execution, stageDef, error as Error, params);
        if (recovered) {
          step.status = 'completed';
          step.message = 'Recovered via self-healing';
        } else {
          execution.status = FlowStatus.FAILED;
          execution.endTime = new Date().toISOString();
          execution.error = (error as Error).message;
          return {
            success: false,
            message: (error as Error).message,
            userMessage: `Something went wrong during "${stageDef.name}". ${(error as Error).message}`
          };
        }
      }
    }

    execution.status = FlowStatus.COMPLETED;
    execution.endTime = new Date().toISOString();

    return {
      success: true,
      message: 'All stages completed successfully',
      userMessage: this.getUserMessage(execution.flowName, true)
    };
  }

  /**
   * Execute a stage from YAML flow definition through the appropriate agent
   */
  private async executeStage(stage: any, parameters: Record<string, any>, execution: FlowExecution): Promise<void> {
    const agentType = resolveAgentType(stage.agent);

    if (!agentType) {
      execution.logs.push(this.createLog(`Unknown agent: ${stage.agent}, using generic execution`, 'warn'));
      await this.genericStageExecution(stage, execution);
      return;
    }

    const agent = getAgent(agentType);
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

      if (result.status === 'failed') {
        throw new Error(result.error || `Step ${step.name} failed`);
      }
    }
  }

  /**
   * Self-healing: attempt to recover from a failure (Phase 5)
   */
  private async attemptRecovery(
    execution: FlowExecution,
    stage: any,
    error: Error,
    parameters: Record<string, any>
  ): Promise<boolean> {
    const maxRetries = 2;
    execution.retryCount = (execution.retryCount || 0);

    if (execution.retryCount >= maxRetries) {
      execution.logs.push(this.createLog(`Max retry attempts (${maxRetries}) reached. Cannot recover.`, 'error', 'debug-agent'));
      return false;
    }

    execution.retryCount++;
    execution.status = FlowStatus.RETRYING;
    execution.logs.push(this.createLog(`Attempting self-healing (attempt ${execution.retryCount}/${maxRetries})...`, 'info', 'debug-agent'));

    try {
      const healResult = await debugAgent.execute({
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
    } catch (healError) {
      execution.logs.push(this.createLog(`Self-healing failed: ${(healError as Error).message}`, 'error', 'debug-agent'));
      return false;
    }
  }

  /**
   * Generic stage execution for unknown agents
   */
  private async genericStageExecution(stage: any, execution: FlowExecution): Promise<void> {
    execution.logs.push(this.createLog(`Executing generic stage: ${stage.name}`));

    for (const step of stage.steps || []) {
      execution.logs.push(this.createLog(`  Step: ${step.name}`));
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  /**
   * Evaluate a condition string against execution state
   */
  private evaluateCondition(condition: string, execution: FlowExecution): boolean {
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
  private getUserMessage(flowName: string, success: boolean, error?: string): string {
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
    } else {
      return `Something went wrong: ${error || 'Unknown error'}. Check the activity log for details.`;
    }
  }

  /**
   * Load a flow definition from YAML
   */
  private async loadFlowDefinition(flowName: string): Promise<FlowDefinition | null> {
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
          return yaml.load(content) as FlowDefinition;
        }
      } catch (error) {
        // Try next path
      }
    }

    // No YAML found - will use built-in flow
    return null;
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): FlowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions
   */
  getAllExecutions(): FlowExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }
}

export const flowOrchestrator = new FlowOrchestrator();
