// ============================================================
// Orbit DevOps - Orchestrator Tests
// Unit tests for flow orchestration
// ============================================================

import { flowOrchestrator } from './orchestrator';
import { FlowStatus } from './types';
import { gitlabAdapter } from './gitlab-adapter';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

jest.setTimeout(90000);

describe('Flow Orchestrator', () => {
  it('should execute a simple flow', async () => {
    const result = await flowOrchestrator.executeFlow('test-exec-1', 'deploy-flow', {});
    expect(result.success).toBe(true);
  });

  it('should handle unknown flow gracefully', async () => {
    const result = await flowOrchestrator.executeFlow('test-exec-2', 'non-existent-flow', {});
    // Should still return a result (built-in flow fallback)
    expect(result).toBeDefined();
  }, 30000);

  it('should track execution status', async () => {
    const execId = 'test-exec-3';
    await flowOrchestrator.executeFlow(execId, 'deploy-flow', {});
    
    const execution = await flowOrchestrator.getExecution(execId);
    expect(execution).toBeDefined();
    if (execution) {
      expect(execution.id).toBe(execId);
      expect(execution.flowName).toBe('deploy-flow');
    }
  });

  it('should finalize a running execution after the GitLab pipeline succeeds', async () => {
    const execId = 'test-exec-pipeline-success';
    const timestamp = new Date().toISOString();
    const pipeline = {
      id: 4242,
      status: 'running' as const,
      ref: 'hackathon-mvp',
      url: 'https://gitlab.com/tmushd/Orbit/-/pipelines/4242',
      provider: 'gitlab' as const,
      source: 'deploy-agent' as const,
      environment: 'staging',
      updatedAt: timestamp
    };

    const execution = {
      id: execId,
      flowName: 'deploy-flow',
      status: FlowStatus.RUNNING,
      parameters: {},
      startTime: timestamp,
      logs: [],
      progress: [
        {
          stage: 'deploy',
          agent: 'deploy-agent',
          status: 'running' as const,
          timestamp
        }
      ],
      result: {
        success: true,
        message: 'Waiting for GitLab pipeline to finish',
        userMessage: 'Your deployment pipeline is running in GitLab for staging.',
        output: {
          environment: 'staging',
          pipelinePending: true
        },
        latestPipeline: pipeline,
        pipelines: [pipeline]
      },
      latestPipeline: pipeline,
      pipelines: [pipeline]
    };

    const getPipelineStatusSpy = jest.spyOn(gitlabAdapter, 'getPipelineStatus').mockResolvedValue({
      id: 4242,
      status: 'success',
      ref: 'hackathon-mvp',
      webUrl: 'https://gitlab.com/tmushd/Orbit/-/pipelines/4242',
      createdAt: timestamp,
      updatedAt: new Date(Date.now() + 1000).toISOString()
    });

    (flowOrchestrator as any).executions.set(execId, execution);

    const refreshedExecution = await flowOrchestrator.getExecution(execId);

    expect(refreshedExecution?.status).toBe(FlowStatus.COMPLETED);
    expect(refreshedExecution?.result?.success).toBe(true);
    expect(refreshedExecution?.result?.output?.pipelinePending).toBe(false);
    expect(refreshedExecution?.latestPipeline?.status).toBe('success');
    expect(refreshedExecution?.progress[0].status).toBe('completed');

    getPipelineStatusSpy.mockRestore();
    (flowOrchestrator as any).executions.delete(execId);
  });

  it('should run the multi-agent flow with real code and git side effects', async () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-multi-agent-'));
    const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-multi-agent-remote-'));
    const previousRepoRoot = process.env.ORBIT_REPO_ROOT;
    const previousGitlabToken = process.env.GITLAB_TOKEN;
    const previousGitlabProjectId = process.env.GITLAB_PROJECT_ID;

    try {
      execFileSync('git', ['init', '--bare'], { cwd: remoteDir });
      fs.mkdirSync(path.join(repoDir, 'backend', 'src'), { recursive: true });
      execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir });
      execFileSync('git', ['config', 'user.name', 'Orbit Test'], { cwd: repoDir });
      execFileSync('git', ['config', 'user.email', 'orbit@example.com'], { cwd: repoDir });
      fs.writeFileSync(path.join(repoDir, 'README.md'), '# Multi Agent Repo\n');
      execFileSync('git', ['add', 'README.md'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });
      execFileSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: repoDir });

      process.env.ORBIT_REPO_ROOT = repoDir;
      delete process.env.GITLAB_TOKEN;
      delete process.env.GITLAB_PROJECT_ID;

      const result = await flowOrchestrator.executeFlow('test-exec-multi-agent', 'multi-agent-flow', {
        feature: 'phase3-flow'
      });

      expect(result.success).toBe(true);
      const currentBranch = execFileSync('git', ['branch', '--show-current'], { cwd: repoDir, encoding: 'utf8' }).trim();
      const branchList = execFileSync('git', ['branch', '--list'], { cwd: repoDir, encoding: 'utf8' });
      const recentLog = execFileSync('git', ['log', '--oneline', '-5'], { cwd: repoDir, encoding: 'utf8' });
      expect(branchList).toContain('codex/');
      expect(currentBranch).toBe('main');
      expect(fs.existsSync(path.join(repoDir, 'backend', 'src', 'generated', 'phase3-flow', 'index.ts'))).toBe(true);
      expect(recentLog).toContain('Applied changes via Orbit');
    } finally {
      if (previousRepoRoot === undefined) {
        delete process.env.ORBIT_REPO_ROOT;
      } else {
        process.env.ORBIT_REPO_ROOT = previousRepoRoot;
      }

      if (previousGitlabToken === undefined) {
        delete process.env.GITLAB_TOKEN;
      } else {
        process.env.GITLAB_TOKEN = previousGitlabToken;
      }

      if (previousGitlabProjectId === undefined) {
        delete process.env.GITLAB_PROJECT_ID;
      } else {
        process.env.GITLAB_PROJECT_ID = previousGitlabProjectId;
      }

      fs.rmSync(repoDir, { recursive: true, force: true });
      fs.rmSync(remoteDir, { recursive: true, force: true });
      (flowOrchestrator as any).executions.delete('test-exec-multi-agent');
    }
  });

  it('should self-heal a failing debug flow and retry successfully', async () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-self-heal-'));
    const previousRepoRoot = process.env.ORBIT_REPO_ROOT;
    const previousGitlabToken = process.env.GITLAB_TOKEN;
    const previousGitlabProjectId = process.env.GITLAB_PROJECT_ID;

    try {
      fs.mkdirSync(path.join(repoDir, 'backend', 'src'), { recursive: true });
      execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir });
      execFileSync('git', ['config', 'user.name', 'Orbit Test'], { cwd: repoDir });
      execFileSync('git', ['config', 'user.email', 'orbit@example.com'], { cwd: repoDir });
      fs.writeFileSync(path.join(repoDir, 'README.md'), '# Self Healing Repo\n');
      execFileSync('git', ['add', 'README.md'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });

      process.env.ORBIT_REPO_ROOT = repoDir;
      delete process.env.GITLAB_TOKEN;
      delete process.env.GITLAB_PROJECT_ID;

      const result = await flowOrchestrator.executeFlow('test-exec-self-heal', 'debug-flow', {
        simulateFailure: true,
        feature: 'self-heal'
      });

      expect(result.success).toBe(true);
      expect(result.output?.selfHealing?.recovered).toBe(true);
      expect(result.output?.selfHealing?.fixedFiles?.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(repoDir, 'backend', 'src', 'generated', 'self-healing', 'test-failure.ts'))).toBe(true);

      const recentLog = execFileSync('git', ['log', '--oneline', '-5'], { cwd: repoDir, encoding: 'utf8' });
      expect(recentLog).toContain('Fix applied by Debug Agent');
    } finally {
      if (previousRepoRoot === undefined) {
        delete process.env.ORBIT_REPO_ROOT;
      } else {
        process.env.ORBIT_REPO_ROOT = previousRepoRoot;
      }

      if (previousGitlabToken === undefined) {
        delete process.env.GITLAB_TOKEN;
      } else {
        process.env.GITLAB_TOKEN = previousGitlabToken;
      }

      if (previousGitlabProjectId === undefined) {
        delete process.env.GITLAB_PROJECT_ID;
      } else {
        process.env.GITLAB_PROJECT_ID = previousGitlabProjectId;
      }

      fs.rmSync(repoDir, { recursive: true, force: true });
      (flowOrchestrator as any).executions.delete('test-exec-self-heal');
    }
  });
});
