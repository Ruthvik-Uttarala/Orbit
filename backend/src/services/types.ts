// ============================================================
// Orbit DevOps - Core Type Definitions
// ============================================================

// Flow execution status
export enum FlowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

// Agent types
export enum AgentType {
  CODE = 'code-agent',
  GIT = 'git-agent',
  CICD = 'cicd-agent',
  DEBUG = 'debug-agent',
  DEPLOY = 'deploy-agent',
  SECURITY = 'security-agent'
}

// Agent status
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Intent types recognized by the system
export enum IntentType {
  DEPLOY = 'deploy',
  BUILD = 'build',
  FIX = 'fix',
  UPDATE = 'update',
  CREATE = 'create',
  TEST = 'test',
  ROLLBACK = 'rollback',
  STATUS = 'status',
  UNKNOWN = 'unknown'
}

// Progress step
export interface ProgressStep {
  stage: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  message?: string;
  detail?: string;
  timestamp: string;
  duration?: number;
}

// Flow execution
export interface FlowExecution {
  id: string;
  flowName: string;
  status: FlowStatus;
  parameters: Record<string, any>;
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
  progress: ProgressStep[];
  result?: FlowResult;
  error?: string;
  retryCount?: number;
  intent?: IntentResult;
  latestPipeline?: PipelineSummary;
  pipelines?: PipelineSummary[];
}

// Log entry with structured data
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  agent?: string;
  message: string;
  detail?: string;
}

// Flow result
export interface FlowResult {
  success: boolean;
  output?: Record<string, any>;
  artifacts?: string[];
  message?: string;
  userMessage?: string; // Plain English message for the user
  latestPipeline?: PipelineSummary;
  pipelines?: PipelineSummary[];
}

// Agent execution
export interface AgentExecution {
  id: string;
  agentType: AgentType;
  status: AgentStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
}

// Deploy request
export interface DeployRequest {
  environment?: string;
  version?: string;
  branch?: string;
  parameters?: Record<string, any>;
}

// Deploy response
export interface DeployResponse {
  executionId: string;
  status: FlowStatus;
  message: string;
  timestamp: string;
}

// Intent parsing result
export interface IntentResult {
  intent: IntentType;
  confidence: number;
  flow: string;
  parameters: Record<string, any>;
  rawInput: string;
  normalizedInput: string;
  reasoning: string;
}

// Session-aware context built from recent chat history
export interface SessionContext {
  sessionId: string;
  messageCount: number;
  lastIntent?: IntentType;
  preferredEnvironment?: string;
  recentActions: string[];
  activeFeature?: string;
}

// Decomposed execution task derived from an intent
export interface PlannedTask {
  id: string;
  title: string;
  description: string;
  agent?: string;
  dependsOn?: string[];
  parallelGroup?: string;
}

// High-level execution plan returned to the UI and orchestrator callers
export interface ExecutionPlan {
  summary: string;
  flowName: string;
  strategy: 'sequential' | 'parallel';
  tasks: PlannedTask[];
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'system' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: IntentResult;
    executionId?: string;
    agentType?: string;
    plan?: ExecutionPlan;
    context?: SessionContext;
  };
}

// GitLab pipeline status
export interface GitLabPipeline {
  id: number;
  status: 'created' | 'pending' | 'running' | 'success' | 'failed' | 'canceled';
  ref: string;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineSummary {
  id: number;
  status: GitLabPipeline['status'];
  ref: string;
  url: string;
  provider: 'gitlab';
  source: 'cicd-agent' | 'deploy-agent';
  environment?: string;
  updatedAt: string;
}

// Flow definition (from YAML)
export interface FlowDefinition {
  name: string;
  version: string;
  description: string;
  triggers: Array<{
    type: string;
    action?: string;
    endpoint?: string;
  }>;
  stages: FlowStage[];
  error_handling?: {
    retry?: {
      max_attempts: number;
      backoff?: string;
      initial_delay?: string;
    };
    fallback?: Array<{ action: string }>;
    on_failure?: Array<{
      agent: string;
      action: string;
    }>;
  };
}

// Flow stage
export interface FlowStage {
  name: string;
  description: string;
  agent: string;
  depends_on?: string | string[];
  condition?: string;
  steps: FlowStep[];
}

// Flow step
export interface FlowStep {
  name: string;
  action: string;
  input?: string | string[];
  output?: string;
  timeout?: string;
  type?: string;
}

// Agent definition (runtime)
export interface AgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: 'available' | 'busy' | 'offline';
}

// Self-healing attempt record
export interface HealingAttempt {
  attemptNumber: number;
  timestamp: string;
  failureType: string;
  rootCause: string;
  fixApplied: string;
  outcome: 'success' | 'failure';
  logs: LogEntry[];
}

// Project context for persistent state
export interface ProjectContext {
  projectId: string;
  name: string;
  lastAction?: string;
  lastDeployment?: {
    environment: string;
    version: string;
    timestamp: string;
    status: string;
  };
  history: Array<{
    action: string;
    timestamp: string;
    result: string;
  }>;
}
