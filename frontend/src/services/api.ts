// ============================================================
// Orbit DevOps - Frontend API Service
// TypeScript interfaces and API functions
// ============================================================

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================================
// Types
// ============================================================

export type IntentType = 'deploy' | 'build' | 'fix' | 'update' | 'create' | 'test' | 'rollback' | 'status' | 'unknown';

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
    plan?: ExecutionPlan;
    context?: SessionContext;
  };
}

export interface DeployRequest {
  environment?: string;
  version?: string;
  branch?: string;
  parameters?: Record<string, any>;
}

export interface DeployResponse {
  executionId: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface IntentResponse {
  sessionId: string;
  intent: IntentResult;
  response: string;
  executionId?: string;
  suggestions?: string[];
  plan?: ExecutionPlan;
  context?: SessionContext;
}

export interface ProgressStep {
  stage: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  message?: string;
  timestamp: string;
  duration?: number;
}

export interface PipelineSummary {
  id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'canceled';
  ref: string;
  url: string;
  provider: 'gitlab';
  source: 'cicd-agent' | 'deploy-agent';
  environment?: string;
  updatedAt: string;
}

export interface FlowExecution {
  id: string;
  flowName: string;
  status: string;
  progress: ProgressStep[];
  logs: string[];
  startTime: string;
  endTime?: string;
  error?: string;
  result?: {
    success: boolean;
    message?: string;
    userMessage?: string;
    latestPipeline?: PipelineSummary;
    pipelines?: PipelineSummary[];
  };
  latestPipeline?: PipelineSummary;
  pipelines?: PipelineSummary[];
}

export interface Agent {
  type: string;
  name: string;
  description: string;
  status: string;
  capabilities?: string[];
}

// Orbit-specific types for dashboard
export interface OrbitStatus {
  status: string;
  timestamp: string;
  services: {
    gitlab: string;
    orchestrator: string;
    agents: string;
  };
  project?: {
    name: string;
    lastDeployment: string;
    environment: string;
    version: string;
    testsPassed: number;
    testsTotal: number;
  };
  agents?: {
    name: string;
    type: string;
    status: string;
    description: string;
  }[];
}

export interface OrbitActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  details?: {
    executionId?: string;
    environment?: string;
    latestPipeline?: PipelineSummary;
    [key: string]: any;
  };
}

// ============================================================
// API Functions
// ============================================================

export const orbitApi = {
  // ============ ORBIT SPECIFIC ENDPOINTS ============
  
  // GET /api/orbit/status - Get overall system and project status
  getOrbitStatus: async (): Promise<OrbitStatus> => {
    const response = await api.get('/orbit/status');
    return response.data;
  },

  // GET /api/orbit/activity - Get activity timeline
  getOrbitActivity: async (limit?: number): Promise<{ activities: OrbitActivity[] }> => {
    const response = await api.get('/orbit/activity', { params: { limit } });
    return response.data;
  },

  // GET /api/orbit/health - Get system health
  getOrbitHealth: async (): Promise<OrbitStatus> => {
    const response = await api.get('/orbit/health');
    return response.data;
  },

  // POST /api/orbit/deploy - Trigger deployment
  orbitDeploy: async (request: DeployRequest): Promise<DeployResponse> => {
    const response = await api.post('/orbit/deploy', request);
    return response.data;
  },

  // POST /api/orbit/build - Trigger build
  orbitBuild: async (request?: { branch?: string; parameters?: Record<string, any> }): Promise<DeployResponse> => {
    const response = await api.post('/orbit/build', request || {});
    return response.data;
  },

  // POST /api/orbit/fix - Trigger fix issues
  orbitFix: async (request?: { issue?: string; parameters?: Record<string, any> }): Promise<DeployResponse> => {
    const response = await api.post('/orbit/fix', request || {});
    return response.data;
  },

  // POST /api/orbit/test - Run tests
  orbitTest: async (request?: { scope?: string; parameters?: Record<string, any> }): Promise<DeployResponse> => {
    const response = await api.post('/orbit/test', request || {});
    return response.data;
  },

  // ============ LEGACY ENDPOINTS (for backward compatibility) ============

  // Health
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Intent / Chat
  sendMessage: async (message: string, sessionId?: string): Promise<IntentResponse> => {
    const response = await api.post('/intent/parse', { message, sessionId });
    return response.data;
  },

  getChatHistory: async (sessionId: string) => {
    const response = await api.get(`/intent/chat/${sessionId}`);
    return response.data;
  },

  getSuggestions: async () => {
    const response = await api.get('/intent/suggestions');
    return response.data;
  },

  getExecutionStatus: async (executionId: string) => {
    const response = await api.get(`/intent/execution/${executionId}`);
    return response.data;
  },

  // Deploy
  deploy: async (request: DeployRequest): Promise<DeployResponse> => {
    const response = await api.post('/deploy', request);
    return response.data;
  },

  getDeployStatus: async (executionId: string): Promise<FlowExecution> => {
    const response = await api.get(`/deploy/status/${executionId}`);
    return response.data;
  },

  // Flows
  triggerFlow: async (flowName: string, parameters?: Record<string, any>) => {
    const response = await api.post('/flows/trigger', { flowName, parameters });
    return response.data;
  },

  getFlowStatus: async (executionId: string): Promise<FlowExecution> => {
    const response = await api.get(`/flows/status/${executionId}`);
    return response.data;
  },

  getFlowLogs: async (executionId: string) => {
    const response = await api.get(`/flows/logs/${executionId}`);
    return response.data;
  },

  getFlowDefinitions: async () => {
    const response = await api.get('/flows/definitions');
    return response.data;
  },

  // Agents
  executeAgent: async (agentType: string, input: Record<string, any>) => {
    const response = await api.post('/agents/execute', { agentType, input });
    return response.data;
  },

  getAgents: async (): Promise<{ agents: Agent[] }> => {
    const response = await api.get('/agents');
    return response.data;
  }
};

export default orbitApi;
