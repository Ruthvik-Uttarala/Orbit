export declare enum FlowStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    RETRYING = "retrying"
}
export declare enum AgentType {
    CODE = "code-agent",
    GIT = "git-agent",
    CICD = "cicd-agent",
    DEBUG = "debug-agent",
    DEPLOY = "deploy-agent",
    SECURITY = "security-agent"
}
export declare enum AgentStatus {
    IDLE = "idle",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum IntentType {
    DEPLOY = "deploy",
    BUILD = "build",
    FIX = "fix",
    UPDATE = "update",
    CREATE = "create",
    TEST = "test",
    ROLLBACK = "rollback",
    STATUS = "status",
    UNKNOWN = "unknown"
}
export interface ProgressStep {
    stage: string;
    agent: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    message?: string;
    detail?: string;
    timestamp: string;
    duration?: number;
}
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
export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    agent?: string;
    message: string;
    detail?: string;
}
export interface FlowResult {
    success: boolean;
    output?: Record<string, any>;
    artifacts?: string[];
    message?: string;
    userMessage?: string;
    latestPipeline?: PipelineSummary;
    pipelines?: PipelineSummary[];
}
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
export interface DeployRequest {
    environment?: string;
    version?: string;
    branch?: string;
    parameters?: Record<string, any>;
}
export interface DeployResponse {
    executionId: string;
    status: FlowStatus;
    message: string;
    timestamp: string;
}
export interface IntentResult {
    intent: IntentType;
    confidence: number;
    flow: string;
    parameters: Record<string, any>;
    rawInput: string;
    normalizedInput: string;
    reasoning: string;
}
export interface SessionContext {
    sessionId: string;
    messageCount: number;
    lastIntent?: IntentType;
    preferredEnvironment?: string;
    recentActions: string[];
    activeFeature?: string;
}
export interface PlannedTask {
    id: string;
    title: string;
    description: string;
    agent?: string;
    dependsOn?: string[];
    parallelGroup?: string;
}
export interface ExecutionPlan {
    summary: string;
    flowName: string;
    strategy: 'sequential' | 'parallel';
    tasks: PlannedTask[];
}
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
        latestExecutionId?: string;
        latestPipeline?: PipelineSummary;
    };
}
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
export interface FlowDefinition {
    name: string;
    version: string;
    description: string;
    triggers: Array<{
        type: string;
        action?: string;
        endpoint?: string;
        project?: string;
        ref?: string;
    }>;
    stages: FlowStage[];
    error_handling?: {
        retry?: {
            max_attempts: number;
            backoff?: string;
            initial_delay?: string;
        };
        fallback?: Array<{
            action: string;
        }>;
        on_failure?: Array<{
            agent: string;
            action: string;
        }>;
    };
}
export interface FlowStage {
    name: string;
    description: string;
    agent: string;
    depends_on?: string | string[];
    condition?: string;
    steps: FlowStep[];
}
export interface FlowStep {
    name: string;
    action: string;
    input?: string | string[];
    output?: string;
    timeout?: string;
    type?: string;
}
export interface AgentDefinition {
    type: AgentType;
    name: string;
    description: string;
    capabilities: string[];
    status: 'available' | 'busy' | 'offline';
}
export interface HealingAttempt {
    attemptNumber: number;
    timestamp: string;
    failureType: string;
    rootCause: string;
    fixApplied: string;
    outcome: 'success' | 'failure';
    logs: LogEntry[];
}
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
//# sourceMappingURL=types.d.ts.map