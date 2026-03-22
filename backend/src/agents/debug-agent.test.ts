import { debugAgent } from './debug-agent';
import { gitlabAdapter } from '../services/gitlab-adapter';

describe('DebugAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('analyzes a real GitLab pipeline failure from job data', async () => {
    jest.spyOn(gitlabAdapter, 'getPipelineJobs').mockResolvedValue([
      { id: 101, name: 'build:frontend', stage: 'build', status: 'failed' }
    ] as any);
    jest.spyOn(gitlabAdapter, 'getJobLogs').mockResolvedValue('Module not found: cannot resolve package');

    const execution = await debugAgent.execute({
      action: 'analyze',
      pipelineId: 999
    });

    expect(execution.status).toBe('completed');
    expect(execution.output?.pipelineId).toBe(999);
    expect(execution.output?.failingJobs).toHaveLength(1);
    expect(execution.output?.classification?.type).toBe('build-error');
  });

  it('starts a retry pipeline during full-heal when GitLab context exists', async () => {
    jest.spyOn(gitlabAdapter, 'getPipelineJobs').mockResolvedValue([
      { id: 202, name: 'test:backend', stage: 'test', status: 'failed' }
    ] as any);
    jest.spyOn(gitlabAdapter, 'getJobLogs').mockResolvedValue('Assertion failed in api.test.ts');
    jest.spyOn(gitlabAdapter, 'triggerPipeline').mockResolvedValue({
      id: 303,
      status: 'pending',
      ref: 'hackathon-mvp',
      webUrl: 'https://gitlab.com/tmushd/Orbit/-/pipelines/303',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    jest.spyOn(gitlabAdapter, 'monitorPipeline').mockResolvedValue({
      id: 303,
      status: 'success',
      ref: 'hackathon-mvp',
      webUrl: 'https://gitlab.com/tmushd/Orbit/-/pipelines/303',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const execution = await debugAgent.execute({
      action: 'full-heal',
      pipeline: {
        id: 999,
        ref: 'hackathon-mvp'
      },
      attemptNumber: 1
    });

    expect(execution.status).toBe('completed');
    expect(execution.output?.healed).toBe(true);
    expect(execution.output?.finalOutcome).toBe('success');
    expect(execution.output?.userMessage).toContain('passed after the fix');
    expect(execution.output?.fixedFiles).toHaveLength(1);
  });
});
