import { loadFlowCatalog, resolveFlowsForTrigger } from './flow-catalog';

describe('Flow Catalog', () => {
  it('loads the configured flow definitions', () => {
    const catalog = loadFlowCatalog();
    const flowNames = catalog.map(item => item.definition.name);

    expect(flowNames).toContain('deploy-flow');
    expect(flowNames).toContain('multi-agent-flow');
    expect(flowNames).toContain('test-flow');
  });

  it('resolves a manual deploy trigger to deploy-flow', () => {
    const matches = resolveFlowsForTrigger({ type: 'manual', action: 'deploy' });

    expect(matches.map(match => match.definition.name)).toContain('deploy-flow');
  });

  it('resolves a webhook trigger to test-flow', () => {
    const matches = resolveFlowsForTrigger({ type: 'webhook', endpoint: '/api/flows/test' });

    expect(matches).toHaveLength(1);
    expect(matches[0].definition.name).toBe('test-flow');
  });

  it('resolves a pipeline trigger using project and ref metadata', () => {
    const matches = resolveFlowsForTrigger({ type: 'pipeline', project: 'orbit-devops', ref: 'main' });

    expect(matches.map(match => match.definition.name)).toContain('deploy-flow');
  });
});
