// ============================================================
// Orbit DevOps - Base Agent Class
// All agents extend this for consistent behavior
// ============================================================

import { AgentType, AgentStatus, AgentExecution, LogEntry } from '../services/types';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseAgent {
  readonly type: AgentType;
  readonly name: string;
  readonly description: string;
  readonly capabilities: string[];

  constructor(type: AgentType, name: string, description: string, capabilities: string[]) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
  }

  /**
   * Execute the agent's task
   */
  async execute(input: Record<string, any>): Promise<AgentExecution> {
    const execution: AgentExecution = {
      id: uuidv4(),
      agentType: this.type,
      status: AgentStatus.RUNNING,
      input,
      startTime: new Date().toISOString(),
      logs: []
    };

    this.log(execution, 'info', `${this.name} starting execution`);

    try {
      const output = await this.run(input, execution);
      execution.status = AgentStatus.COMPLETED;
      execution.output = output;
      execution.endTime = new Date().toISOString();
      this.log(execution, 'info', `${this.name} completed successfully`);
    } catch (error) {
      execution.status = AgentStatus.FAILED;
      execution.error = (error as Error).message;
      execution.endTime = new Date().toISOString();
      this.log(execution, 'error', `${this.name} failed: ${(error as Error).message}`);
    }

    return execution;
  }

  /**
   * Abstract method - each agent implements its own logic
   */
  protected abstract run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;

  /**
   * Add a structured log entry
   */
  protected log(execution: AgentExecution, level: LogEntry['level'], message: string, detail?: string): void {
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
  protected async work(ms: number): Promise<void> {
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
      status: 'available' as const
    };
  }
}
