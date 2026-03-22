import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { gitAgent } from './git-agent';

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

describe('GitAgent', () => {
  let repoDir: string;
  let previousRepoRoot: string | undefined;

  beforeEach(() => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-git-agent-'));
    runGit(repoDir, ['init', '-b', 'main']);
    runGit(repoDir, ['config', 'user.name', 'Orbit Test']);
    runGit(repoDir, ['config', 'user.email', 'orbit@example.com']);
    fs.writeFileSync(path.join(repoDir, 'README.md'), '# Test Repo\n');
    runGit(repoDir, ['add', 'README.md']);
    runGit(repoDir, ['commit', '-m', 'Initial commit']);

    previousRepoRoot = process.env.ORBIT_REPO_ROOT;
    process.env.ORBIT_REPO_ROOT = repoDir;
  });

  afterEach(() => {
    if (previousRepoRoot === undefined) {
      delete process.env.ORBIT_REPO_ROOT;
    } else {
      process.env.ORBIT_REPO_ROOT = previousRepoRoot;
    }

    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  it('creates a real local branch', async () => {
    const execution = await gitAgent.execute({
      action: 'create-branch',
      branch: 'phase3-audit',
      from: 'main'
    });

    expect(execution.status).toBe('completed');
    expect(execution.output?.branch).toBe('codex/phase3-audit');
    expect(runGit(repoDir, ['branch', '--show-current'])).toBe('codex/phase3-audit');
  });

  it('creates a real commit for repo changes', async () => {
    fs.writeFileSync(path.join(repoDir, 'feature.txt'), 'phase 3 real git agent\n');

    const execution = await gitAgent.execute({
      action: 'commit',
      files: ['feature.txt'],
      message: 'Add feature file'
    });

    expect(execution.status).toBe('completed');
    expect(execution.output?.saved).toBe(true);
    expect(execution.output?.commit).toBeTruthy();
    expect(runGit(repoDir, ['log', '--oneline', '-1'])).toContain('Add feature file');
  });

  it('creates a branch from the current workspace when uncommitted changes exist', async () => {
    fs.writeFileSync(path.join(repoDir, 'draft.txt'), 'work in progress\n');

    const execution = await gitAgent.execute({
      action: 'create-branch',
      branch: 'dirty-worktree',
      from: 'main'
    });

    expect(execution.status).toBe('completed');
    expect(execution.output?.branch).toBe('codex/dirty-worktree');
    expect(runGit(repoDir, ['branch', '--show-current'])).toBe('codex/dirty-worktree');
    expect(fs.readFileSync(path.join(repoDir, 'draft.txt'), 'utf8')).toContain('work in progress');
  });
});
