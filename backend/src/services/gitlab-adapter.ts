import axios, { AxiosInstance } from 'axios';
import { GitLabPipeline } from './types';

export class GitLabAdapter {
  private client: AxiosInstance;
  private projectId: string;
  private agentName: string;

  constructor() {
    const token = process.env.GITLAB_TOKEN;
    const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
    this.projectId = process.env.GITLAB_PROJECT_ID || '';
    this.agentName = process.env.GITLAB_AGENT || 'orbit-deploy-agent';

    if (!token) {
      console.warn('GitLab token not configured - running in mock mode');
    }

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'PRIVATE-TOKEN': token || '',
        'Content-Type': 'application/json'
      }
    });
  }

  isConfigured(): boolean {
    return !!process.env.GITLAB_TOKEN && !!this.projectId;
  }

  async triggerPipeline(ref: string = 'main', variables: Record<string, string> = {}): Promise<GitLabPipeline | null> {
    if (!this.isConfigured()) {
      // Return mock response in development
      return this.mockPipeline('pending');
    }

    try {
      const response = await this.client.post(`/projects/${encodeURIComponent(this.projectId)}/pipeline`, {
        ref,
        variables: Object.entries(variables).map(([key, value]) => ({ key, value }))
      });

      return {
        id: response.data.id,
        status: response.data.status,
        ref: response.data.ref,
        webUrl: response.data.web_url,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
    } catch (error) {
      console.error('Failed to trigger pipeline:', error);
      throw error;
    }
  }

  async getPipelineStatus(pipelineId: number): Promise<GitLabPipeline | null> {
    if (!this.isConfigured()) {
      return this.mockPipeline('running');
    }

    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(this.projectId)}/pipelines/${pipelineId}`);
      
      return {
        id: response.data.id,
        status: response.data.status,
        ref: response.data.ref,
        webUrl: response.data.web_url,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
    } catch (error) {
      console.error('Failed to get pipeline status:', error);
      throw error;
    }
  }

  async getPipelineJobs(pipelineId: number): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(this.projectId)}/pipelines/${pipelineId}/jobs`);
      return response.data;
    } catch (error) {
      console.error('Failed to get pipeline jobs:', error);
      throw error;
    }
  }

  async getJobLogs(jobId: number): Promise<string> {
    if (!this.isConfigured()) {
      return 'Mock job log output';
    }

    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(this.projectId)}/jobs/${jobId}/trace`);
      return response.data;
    } catch (error) {
      console.error('Failed to get job logs:', error);
      throw error;
    }
  }

  async triggerAgentFlow(flowName: string, parameters: Record<string, any>): Promise<any> {
    // In a real implementation, this would trigger the GitLab Agent
    // For now, we'll simulate it
    if (!this.isConfigured()) {
      return {
        success: true,
        flowName,
        message: 'Flow triggered (mock mode)'
      };
    }

    // Trigger via CI/CD pipeline as fallback
    return this.triggerPipeline('main', {
      FLOW_NAME: flowName,
      ...parameters
    });
  }

  async monitorPipeline(
    pipelineId: number,
    options: {
      pollIntervalMs?: number;
      timeoutMs?: number;
      onProgress?: (pipeline: GitLabPipeline) => void;
    } = {}
  ): Promise<GitLabPipeline> {
    const pollIntervalMs = options.pollIntervalMs ?? 1500;
    const timeoutMs = options.timeoutMs ?? 30000;

    if (!this.isConfigured()) {
      const mockStates: GitLabPipeline['status'][] = ['pending', 'running', 'success'];
      let pipeline = this.mockPipeline(mockStates[0]);

      options.onProgress?.(pipeline);
      for (const state of mockStates.slice(1)) {
        await new Promise(resolve => setTimeout(resolve, Math.min(pollIntervalMs, 500)));
        pipeline = {
          ...pipeline,
          status: state,
          updatedAt: new Date().toISOString()
        };
        options.onProgress?.(pipeline);
      }

      return pipeline;
    }

    const startedAt = Date.now();

    while (true) {
      const pipeline = await this.getPipelineStatus(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      options.onProgress?.(pipeline);

      if (pipeline.status === 'success' || pipeline.status === 'failed' || pipeline.status === 'canceled') {
        return pipeline;
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for pipeline ${pipelineId}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  private mockPipeline(status: 'pending' | 'running' | 'success' | 'failed' | 'canceled'): GitLabPipeline {
    return {
      id: Math.floor(Math.random() * 10000),
      status,
      ref: 'main',
      webUrl: `https://gitlab.com/${this.projectId}/-/pipelines/${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const gitlabAdapter = new GitLabAdapter();
