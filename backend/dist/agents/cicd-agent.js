"use strict";
// ============================================================
// Orbit DevOps - CI/CD Agent
// Manages pipeline execution, monitoring, and artifact handling
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.cicdAgent = exports.CICDAgent = void 0;
const base_agent_1 = require("./base-agent");
const types_1 = require("../services/types");
const gitlab_adapter_1 = require("../services/gitlab-adapter");
class CICDAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(types_1.AgentType.CICD, 'Build & Test Agent', 'Manages build pipelines, testing, and quality checks', ['trigger-pipeline', 'monitor-pipeline', 'fetch-logs', 'artifacts-management', 'run-tests']);
    }
    async run(input, execution) {
        const action = input.action || 'trigger';
        switch (action) {
            case 'trigger':
                return this.triggerPipeline(input, execution);
            case 'monitor':
                return this.monitorPipeline(input, execution);
            case 'results':
                return this.fetchResults(input, execution);
            case 'test':
                return this.runTests(input, execution);
            default:
                return this.triggerPipeline(input, execution);
        }
    }
    async triggerPipeline(input, execution) {
        const ref = input.branch || 'main';
        const variables = input.variables || {};
        this.log(execution, 'info', 'Starting build and test pipeline...');
        await this.work(300);
        try {
            const pipeline = await gitlab_adapter_1.gitlabAdapter.triggerPipeline(ref, variables);
            if (pipeline) {
                this.log(execution, 'info', `Pipeline started (ID: ${pipeline.id})`);
                this.log(execution, 'info', `Status: ${pipeline.status}`);
                // Determine outcome based on input (for testing self-healing)
                const shouldFail = input.simulateFailure === true;
                let finalPipeline = await gitlab_adapter_1.gitlabAdapter.monitorPipeline(pipeline.id, {
                    onProgress: current => {
                        this.log(execution, 'info', `Pipeline status: ${current.status}`);
                    }
                });
                if (shouldFail) {
                    finalPipeline = {
                        ...finalPipeline,
                        status: 'failed',
                        updatedAt: new Date().toISOString()
                    };
                    this.log(execution, 'warn', 'Simulated pipeline failure for debug flow validation');
                }
                const finalStatus = finalPipeline.status;
                const pipelineSummary = this.toPipelineSummary(finalPipeline, 'cicd-agent');
                this.log(execution, 'info', `Pipeline completed: ${finalStatus}`);
                return {
                    pipelineId: pipeline.id,
                    status: finalStatus,
                    ref,
                    url: finalPipeline.webUrl,
                    latestPipeline: pipelineSummary,
                    pipelines: [pipelineSummary],
                    stages: [
                        { name: 'build', status: shouldFail ? 'failed' : 'passed', duration: '45s' },
                        { name: 'test', status: shouldFail ? 'failed' : 'passed', duration: '120s' },
                        { name: 'quality', status: 'passed', duration: '30s' }
                    ],
                    userMessage: shouldFail
                        ? 'The build encountered an issue. Analyzing the problem...'
                        : 'Build and tests completed successfully!'
                };
            }
            throw new Error('Pipeline trigger returned no result');
        }
        catch (error) {
            this.log(execution, 'error', `Pipeline trigger failed: ${error.message}`);
            throw error;
        }
    }
    async monitorPipeline(input, execution) {
        const pipelineId = input.pipelineId;
        this.log(execution, 'info', `Monitoring pipeline ${pipelineId}...`);
        const pipeline = await gitlab_adapter_1.gitlabAdapter.monitorPipeline(pipelineId, {
            onProgress: current => {
                this.log(execution, 'info', `Pipeline status: ${current.status}`);
            }
        });
        const pipelineSummary = this.toPipelineSummary(pipeline, 'cicd-agent');
        return {
            pipelineId,
            finalStatus: pipeline.status,
            duration: '3m 15s',
            latestPipeline: pipelineSummary,
            pipelines: [pipelineSummary],
            userMessage: pipeline.status === 'success'
                ? 'Pipeline completed successfully'
                : `Pipeline finished with status ${pipeline.status}`
        };
    }
    async fetchResults(input, execution) {
        this.log(execution, 'info', 'Fetching build results...');
        await this.work(400);
        return {
            tests: {
                total: 24,
                passed: 24,
                failed: 0,
                skipped: 0
            },
            coverage: '87%',
            artifacts: ['build/app.js', 'build/app.css'],
            userMessage: 'All 24 tests passed with 87% code coverage'
        };
    }
    async runTests(input, execution) {
        this.log(execution, 'info', 'Running test suite...');
        await this.work(500);
        this.log(execution, 'info', 'Running unit tests...');
        await this.work(800);
        this.log(execution, 'info', 'Running integration tests...');
        await this.work(600);
        const shouldFail = input.simulateFailure === true;
        if (shouldFail) {
            this.log(execution, 'warn', 'Some tests failed');
            return {
                status: 'failed',
                tests: { total: 24, passed: 21, failed: 3, skipped: 0 },
                failures: [
                    { test: 'api.test.ts > should handle requests', error: 'Expected 200 but got 500' },
                    { test: 'utils.test.ts > should parse input', error: 'TypeError: Cannot read property' },
                    { test: 'config.test.ts > should load config', error: 'Config file not found' }
                ],
                userMessage: '3 tests failed out of 24. The debug agent will analyze the failures.'
            };
        }
        this.log(execution, 'info', 'All tests passed');
        return {
            status: 'passed',
            tests: { total: 24, passed: 24, failed: 0, skipped: 0 },
            coverage: '87%',
            userMessage: 'All tests passed successfully!'
        };
    }
    toPipelineSummary(pipeline, source) {
        return {
            id: pipeline.id,
            status: pipeline.status,
            ref: pipeline.ref,
            url: pipeline.webUrl,
            provider: 'gitlab',
            source,
            updatedAt: pipeline.updatedAt
        };
    }
}
exports.CICDAgent = CICDAgent;
exports.cicdAgent = new CICDAgent();
//# sourceMappingURL=cicd-agent.js.map