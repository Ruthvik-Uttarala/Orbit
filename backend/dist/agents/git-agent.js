"use strict";
// ============================================================
// Orbit DevOps - Git Agent (Version Control Abstraction)
// Handles all version control operations, hiding Git complexity
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitAgent = exports.GitAgent = void 0;
const base_agent_1 = require("./base-agent");
const types_1 = require("../services/types");
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class GitAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(types_1.AgentType.GIT, 'Version Control Agent', 'Handles version control operations transparently', ['create-branch', 'commit-changes', 'merge-branch', 'push', 'resolve-conflicts', 'create-version']);
    }
    async run(input, execution) {
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
    getRepoRoot() {
        return process.env.ORBIT_REPO_ROOT || path.resolve(process.cwd(), '..');
    }
    getDefaultBranchName() {
        return `codex/update-${Date.now()}`;
    }
    normalizeBranchName(branch) {
        if (!branch) {
            return this.getDefaultBranchName();
        }
        return branch.startsWith('codex/') ? branch : `codex/${branch.replace(/^\/+/, '')}`;
    }
    async runGit(args, allowExitCodes = [0]) {
        try {
            const { stdout = '', stderr = '' } = await execFileAsync('git', args, {
                cwd: this.getRepoRoot()
            });
            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0
            };
        }
        catch (error) {
            const exitCode = typeof error.code === 'number' ? error.code : 1;
            const stdout = String(error.stdout || '').trim();
            const stderr = String(error.stderr || '').trim();
            if (allowExitCodes.includes(exitCode)) {
                return { stdout, stderr, exitCode };
            }
            throw new Error(stderr || stdout || `git ${args.join(' ')} failed`);
        }
    }
    async getCurrentBranch() {
        const result = await this.runGit(['branch', '--show-current']);
        return result.stdout || 'HEAD';
    }
    async getRemotes() {
        const result = await this.runGit(['remote']);
        return result.stdout ? result.stdout.split('\n').filter(Boolean) : [];
    }
    async getPreferredRemote() {
        const remotes = await this.getRemotes();
        return remotes.find(remote => remote === 'gitlab')
            || remotes.find(remote => remote === 'origin')
            || remotes[0];
    }
    async getRemoteUrl(remote) {
        const result = await this.runGit(['remote', 'get-url', remote], [0, 2]);
        return result.exitCode === 0 ? result.stdout : undefined;
    }
    toGitLabProjectPath(remoteUrl) {
        if (!remoteUrl) {
            return undefined;
        }
        const httpsMatch = remoteUrl.match(/gitlab\.com[:/](.+?)(?:\.git)?$/);
        return httpsMatch?.[1];
    }
    async createGitLabMergeRequest(sourceBranch, targetBranch, title) {
        const token = process.env.GITLAB_TOKEN;
        const projectId = process.env.GITLAB_PROJECT_ID;
        const apiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
        if (!token || !projectId) {
            return null;
        }
        try {
            const response = await axios_1.default.post(`${apiUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`, {
                source_branch: sourceBranch,
                target_branch: targetBranch,
                title
            }, {
                headers: {
                    'PRIVATE-TOKEN': token,
                    'Content-Type': 'application/json'
                }
            });
            return {
                mergeRequestId: response.data.iid,
                url: response.data.web_url,
                created: true
            };
        }
        catch (_error) {
            return null;
        }
    }
    async createBranch(input, execution) {
        const branchName = this.normalizeBranchName(input.branch);
        const from = input.from || 'main';
        this.log(execution, 'info', 'Creating a new version branch for your changes...');
        const existingBranch = await this.runGit(['rev-parse', '--verify', branchName], [0, 128]);
        if (existingBranch.exitCode === 0) {
            await this.runGit(['switch', branchName]);
            this.log(execution, 'info', `Switched to existing branch ${branchName}`);
        }
        else {
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
    async commitChanges(input, execution) {
        const files = input.files;
        const message = input.message || 'Applied changes via Orbit';
        this.log(execution, 'info', 'Saving your changes...');
        if (Array.isArray(files) && files.length > 0) {
            await this.runGit(['add', '--', ...files]);
        }
        else if (typeof files === 'string') {
            await this.runGit(['add', '--', files]);
        }
        else {
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
    async pushChanges(input, execution) {
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
    async createMergeRequest(input, execution) {
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
    async mergeBranch(input, execution) {
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
    async createVersion(input, execution) {
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
exports.GitAgent = GitAgent;
exports.gitAgent = new GitAgent();
//# sourceMappingURL=git-agent.js.map