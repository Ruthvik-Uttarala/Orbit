"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitlabAdapter = exports.GitLabAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
class GitLabAdapter {
    constructor() {
        this.warnedMissingConfig = false;
    }
    getConfig() {
        const token = process.env.GITLAB_TOKEN || '';
        const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
        const projectId = process.env.GITLAB_PROJECT_ID || '';
        const agentName = process.env.GITLAB_AGENT || 'orbit-deploy-agent';
        const ref = process.env.GITLAB_REF || 'main';
        if ((!token || !projectId) && !this.warnedMissingConfig) {
            console.warn('GitLab token not configured - running in mock mode');
            this.warnedMissingConfig = true;
        }
        return {
            token,
            apiUrl,
            projectId,
            agentName,
            ref
        };
    }
    getDefaultRef() {
        return this.getConfig().ref;
    }
    getClient() {
        const { apiUrl, token } = this.getConfig();
        return axios_1.default.create({
            baseURL: apiUrl,
            headers: {
                'PRIVATE-TOKEN': token,
                'Content-Type': 'application/json'
            }
        });
    }
    isConfigured() {
        const { token, projectId } = this.getConfig();
        return !!token && !!projectId;
    }
    async triggerPipeline(ref = this.getDefaultRef(), variables = {}) {
        if (!this.isConfigured()) {
            // Return mock response in development
            return this.mockPipeline('pending');
        }
        try {
            const { projectId } = this.getConfig();
            const payload = { ref };
            const pipelineVariables = Object.entries(variables).map(([key, value]) => ({ key, value }));
            if (pipelineVariables.length > 0) {
                payload.variables = pipelineVariables;
            }
            const response = await this.createPipelineRequest(projectId, payload, ref);
            return {
                id: response.data.id,
                status: response.data.status,
                ref: response.data.ref,
                webUrl: response.data.web_url,
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at
            };
        }
        catch (error) {
            console.error(`Failed to trigger pipeline: ${this.describeError(error)}`);
            throw error;
        }
    }
    async getPipelineStatus(pipelineId) {
        if (!this.isConfigured()) {
            return this.mockPipeline('running');
        }
        try {
            const { projectId } = this.getConfig();
            const response = await this.getClient().get(`/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`);
            return {
                id: response.data.id,
                status: response.data.status,
                ref: response.data.ref,
                webUrl: response.data.web_url,
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at
            };
        }
        catch (error) {
            console.error(`Failed to get pipeline status: ${this.describeError(error)}`);
            throw error;
        }
    }
    async getPipelineJobs(pipelineId) {
        if (!this.isConfigured()) {
            return [];
        }
        try {
            const { projectId } = this.getConfig();
            const response = await this.getClient().get(`/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/jobs`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to get pipeline jobs: ${this.describeError(error)}`);
            throw error;
        }
    }
    async getJobLogs(jobId) {
        if (!this.isConfigured()) {
            return 'Mock job log output';
        }
        try {
            const { projectId } = this.getConfig();
            const response = await this.getClient().get(`/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/trace`);
            return response.data;
        }
        catch (error) {
            console.error(`Failed to get job logs: ${this.describeError(error)}`);
            throw error;
        }
    }
    async triggerAgentFlow(flowName, parameters) {
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
        return this.triggerPipeline(this.getDefaultRef(), {
            FLOW_NAME: flowName,
            ...parameters
        });
    }
    async monitorPipeline(pipelineId, options = {}) {
        const pollIntervalMs = options.pollIntervalMs ?? 1500;
        const timeoutMs = options.timeoutMs ?? 30000;
        if (!this.isConfigured()) {
            const mockStates = ['pending', 'running', 'success'];
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
    mockPipeline(status) {
        const { projectId, ref } = this.getConfig();
        return {
            id: Math.floor(Math.random() * 10000),
            status,
            ref,
            webUrl: `https://gitlab.com/${projectId}/-/pipelines/${Math.floor(Math.random() * 10000)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    async createPipelineRequest(projectId, payload, ref) {
        try {
            return await this.getClient().post(`/projects/${encodeURIComponent(projectId)}/pipeline`, payload);
        }
        catch (error) {
            if (this.shouldRetryWithoutVariables(error, payload.variables)) {
                return this.getClient().post(`/projects/${encodeURIComponent(projectId)}/pipeline`, { ref });
            }
            throw error;
        }
    }
    shouldRetryWithoutVariables(error, variables) {
        if (!variables || !Array.isArray(variables) || variables.length === 0 || !axios_1.default.isAxiosError(error)) {
            return false;
        }
        const baseMessages = error.response?.data?.message?.base;
        return Array.isArray(baseMessages)
            && baseMessages.some((message) => message.includes('Insufficient permissions to set pipeline variables'));
    }
    describeError(error) {
        if (!axios_1.default.isAxiosError(error)) {
            return error instanceof Error ? error.message : 'Unknown error';
        }
        const status = error.response?.status;
        const data = error.response?.data;
        if (data?.message?.base && Array.isArray(data.message.base)) {
            return `${status ?? 'unknown'} ${data.message.base.join(', ')}`;
        }
        if (typeof data?.message === 'string') {
            return `${status ?? 'unknown'} ${data.message}`;
        }
        return error.message;
    }
}
exports.GitLabAdapter = GitLabAdapter;
// Export singleton instance
exports.gitlabAdapter = new GitLabAdapter();
//# sourceMappingURL=gitlab-adapter.js.map