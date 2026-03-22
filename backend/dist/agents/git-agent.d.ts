import { BaseAgent } from './base-agent';
import { AgentExecution } from '../services/types';
export declare class GitAgent extends BaseAgent {
    constructor();
    protected run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>>;
    private getRepoRoot;
    private getDefaultBranchName;
    private normalizeBranchName;
    private runGit;
    private getCurrentBranch;
    private getRemotes;
    private getPreferredRemote;
    private getRemoteUrl;
    private toGitLabProjectPath;
    private createGitLabMergeRequest;
    private normalizeFiles;
    private createBranch;
    private commitChanges;
    private pushChanges;
    private createMergeRequest;
    private mergeBranch;
    private createVersion;
}
export declare const gitAgent: GitAgent;
//# sourceMappingURL=git-agent.d.ts.map