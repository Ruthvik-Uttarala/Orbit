// ============================================================
// Orbit DevOps - Git Agent (Version Control Abstraction)
// Handles all version control operations, hiding Git complexity
// ============================================================

import { BaseAgent } from './base-agent';
import { AgentType, AgentExecution } from '../services/types';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export class GitAgent extends BaseAgent {
  constructor() {
    super(
      AgentType.GIT,
      'Version Control Agent',
      'Handles version control operations transparently',
      ['create-branch', 'commit-changes', 'merge-branch', 'push', 'resolve-conflicts', 'create-version']
    );
  }

  protected async run(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    const action = input.action || 'commit';

    switch (action) {
      case 'create-branch':
        return this.createBranch(input, execution);
      case 'commit':
        return this.commitChanges(input, execution);
      case 'push':
        return this.pushChanges(input, execution);
      case 'merge-request':
        return this.createMergeRequest(input, execution);
      case 'merge':
        return this.mergeBranch(input, execution);
      case 'create-version':
        return this.createVersion(input, execution);
      default:
        return this.commitChanges(input, execution);
    }
  }

  private getRepoRoot(): string {
    return process.env.ORBIT_REPO_ROOT || path.resolve(process.cwd(), '..');
  }

  private getDefaultBranchName(): string {
    return `codex/update-${Date.now()}`;
  }

  private normalizeBranchName(branch?: string): string {
    if (!branch) {
      return this.getDefaultBranchName();
    }

    return branch.startsWith('codex/') ? branch : `codex/${branch.replace(/^\/+/, '')}`;
  }

  private async runGit(args: string[], allowExitCodes: number[] = [0]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { stdout = '', stderr = '' } = await execFileAsync('git', args, {
        cwd: this.getRepoRoot()
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      const exitCode = typeof error.code === 'number' ? error.code : 1;
      const stdout = String(error.stdout || '').trim();
      const stderr = String(error.stderr || '').trim();

      if (allowExitCodes.includes(exitCode)) {
        return { stdout, stderr, exitCode };
      }

      throw new Error(stderr || stdout || `git ${args.join(' ')} failed`);
    }
  }

  private async getCurrentBranch(): Promise<string> {
    const result = await this.runGit(['branch', '--show-current']);
    return result.stdout || 'HEAD';
  }

  private async getRemotes(): Promise<string[]> {
    const result = await this.runGit(['remote']);
    return result.stdout ? result.stdout.split('\n').filter(Boolean) : [];
  }

  private async getPreferredRemote(): Promise<string | undefined> {
    const remotes = await this.getRemotes();
    return remotes.find(remote => remote === 'gitlab')
      || remotes.find(remote => remote === 'origin')
      || remotes[0];
  }

  private async getRemoteUrl(remote: string): Promise<string | undefined> {
    const result = await this.runGit(['remote', 'get-url', remote], [0, 2]);
    return result.exitCode === 0 ? result.stdout : undefined;
  }

  private toGitLabProjectPath(remoteUrl?: string): string | undefined {
    if (!remoteUrl) {
      return undefined;
    }

    const httpsMatch = remoteUrl.match(/gitlab\.com[:/](.+?)(?:\.git)?$/);
    return httpsMatch?.[1];
  }

  private async createGitLabMergeRequest(sourceBranch: string, targetBranch: string, title: string): Promise<Record<string, any> | null> {
    const token = process.env.GITLAB_TOKEN;
    const projectId = process.env.GITLAB_PROJECT_ID;
    const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

    if (!token || !projectId) {
      return null;
    }

    try {
      const response = await axios.post(
        `${apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`,
        {
          source_branch: sourceBranch,
          target_branch: targetBranch,
          title
        },
        {
          headers: {
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        mergeRequestId: response.data.iid,
        url: response.data.web_url,
        created: true
      };
    } catch (_error) {
      return null;
    }
  }

  private normalizeFiles(files: unknown): string[] {
    if (!files) {
      return [];
    }

    if (typeof files === 'string') {
      return [files];
    }

    if (Array.isArray(files)) {
      return files
        .map(file => {
          if (typeof file === 'string') {
            return file;
          }

          if (file && typeof file === 'object' && 'path' in file && typeof (file as { path?: unknown }).path === 'string') {
            return (file as { path: string }).path;
          }

          return '';
        })
        .filter(Boolean);
    }

    return [];
  }

  private async createBranch(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    const branchName = this.normalizeBranchName(input.branch);
    const from = input.from || 'main';

    this.log(execution, 'info', 'Creating a new version branch for your changes...');
    const existingBranch = await this.runGit(['rev-parse', '--verify', branchName], [0, 128]);

    if (existingBranch.exitCode === 0) {
      await this.runGit(['switch', branchName]);
      this.log(execution, 'info', `Switched to existing branch ${branchName}`);
    } else {
      await this.runGit(['switch', '-c', branchName, from]);
      this.log(execution, 'info', `New branch created: ${branchName} from ${from}`);
    }

    return {
      branch: branchName,
      from,
      created: true,
      userMessage: 'Created a new workspace for your changes'
    };
  }

  private async commitChanges(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    const files = this.normalizeFiles(input.files);
    const message = input.message || 'Applied changes via Orbit';

    this.log(execution, 'info', 'Saving your changes...');
    if (files.length > 0) {
      await this.runGit(['add', '--', ...files]);
    } else {
      await this.runGit(['add', '-A']);
    }

    const staged = await this.runGit(['diff', '--cached', '--name-only']);
    const stagedFiles = staged.stdout ? staged.stdout.split('\n').filter(Boolean) : [];

    if (stagedFiles.length === 0) {
      this.log(execution, 'info', 'No staged changes found');
      return {
        commit: null,
        files: [],
        message,
        saved: false,
        userMessage: 'No new changes were ready to save'
      };
    }

    this.log(execution, 'info', `Saved ${stagedFiles.length} file(s)`);
    await this.runGit(['commit', '-m', message]);

    const commitHash = (await this.runGit(['rev-parse', '--short', 'HEAD'])).stdout;
    this.log(execution, 'info', `Changes saved with reference: ${commitHash}`);

    return {
      commit: commitHash,
      files: stagedFiles,
      message,
      saved: true,
      userMessage: `Your changes have been saved (${stagedFiles.length} files)`
    };
  }

  private async pushChanges(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    this.log(execution, 'info', 'Uploading your changes...');
    const branch = input.branch || await this.getCurrentBranch();
    const remote = input.remote || await this.getPreferredRemote();

    if (!remote) {
      throw new Error('No Git remote is configured for this repository');
    }

    await this.runGit(['push', '-u', remote, branch]);
    this.log(execution, 'info', `Changes uploaded successfully to ${remote}/${branch}`);

    return {
      pushed: true,
      branch,
      remote,
      userMessage: 'Your changes have been uploaded and are ready for review'
    };
  }

  private async createMergeRequest(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    this.log(execution, 'info', 'Preparing your changes for integration...');
    const sourceBranch = input.branch || await this.getCurrentBranch();
    const targetBranch = input.target || 'main';
    const title = input.title || `Merge ${sourceBranch} into ${targetBranch}`;

    const createdMergeRequest = await this.createGitLabMergeRequest(sourceBranch, targetBranch, title);

    if (createdMergeRequest) {
      this.log(execution, 'info', `Change request #${createdMergeRequest.mergeRequestId} created`);
      return {
        ...createdMergeRequest,
        source: sourceBranch,
        target: targetBranch,
        userMessage: `Change request #${createdMergeRequest.mergeRequestId} created and ready for integration`
      };
    }

    const remote = input.remote || await this.getPreferredRemote();
    const remoteUrl = remote ? await this.getRemoteUrl(remote) : undefined;
    const projectPath = this.toGitLabProjectPath(remoteUrl);
    const url = projectPath
      ? `https://gitlab.com/${projectPath}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(sourceBranch)}&merge_request[target_branch]=${encodeURIComponent(targetBranch)}`
      : undefined;

    this.log(execution, 'info', 'Prepared merge request link');

    return {
      mergeRequestId: null,
      source: sourceBranch,
      target: targetBranch,
      created: false,
      url,
      userMessage: url
        ? 'Prepared a merge request link for review'
        : 'Prepared your branch for a merge request'
    };
  }

  private async mergeBranch(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    const sourceBranch = input.branch || await this.getCurrentBranch();
    const targetBranch = input.target || 'main';

    this.log(execution, 'info', 'Integrating your changes into the main project...');
    await this.runGit(['switch', targetBranch]);
    await this.runGit(['merge', '--no-ff', sourceBranch, '-m', `Merge branch '${sourceBranch}' into ${targetBranch}`]);
    this.log(execution, 'info', 'Changes integrated successfully');

    return {
      merged: true,
      source: sourceBranch,
      target: targetBranch,
      userMessage: 'Your changes have been integrated into the main project'
    };
  }

  private async createVersion(input: Record<string, any>, execution: AgentExecution): Promise<Record<string, any>> {
    const version = input.version || `v1.0.${Math.floor(Math.random() * 100)}`;

    this.log(execution, 'info', `Creating version ${version}...`);
    await this.runGit(['tag', version], [0, 128]);
    this.log(execution, 'info', `Version ${version} created`);

    return {
      version,
      created: true,
      userMessage: `Version ${version} has been created`
    };
  }
}

export const gitAgent = new GitAgent();
