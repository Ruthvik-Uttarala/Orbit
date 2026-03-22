import { GitLabPipeline } from './types';
export declare class GitLabAdapter {
    private warnedMissingConfig;
    private getConfig;
    private getClient;
    isConfigured(): boolean;
    triggerPipeline(ref?: string, variables?: Record<string, string>): Promise<GitLabPipeline | null>;
    getPipelineStatus(pipelineId: number): Promise<GitLabPipeline | null>;
    getPipelineJobs(pipelineId: number): Promise<any[]>;
    getJobLogs(jobId: number): Promise<string>;
    triggerAgentFlow(flowName: string, parameters: Record<string, any>): Promise<any>;
    monitorPipeline(pipelineId: number, options?: {
        pollIntervalMs?: number;
        timeoutMs?: number;
        onProgress?: (pipeline: GitLabPipeline) => void;
    }): Promise<GitLabPipeline>;
    private mockPipeline;
}
export declare const gitlabAdapter: GitLabAdapter;
//# sourceMappingURL=gitlab-adapter.d.ts.map