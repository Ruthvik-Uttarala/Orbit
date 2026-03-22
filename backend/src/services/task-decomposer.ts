// ============================================================
// Orbit DevOps - Task Decomposer
// Turns a recognized intent into a reusable execution plan
// ============================================================

import { ExecutionPlan, IntentResult, IntentType, PlannedTask, SessionContext } from './types';

function createTask(
  id: string,
  title: string,
  description: string,
  agent?: string,
  dependsOn?: string[],
  parallelGroup?: string
): PlannedTask {
  return {
    id,
    title,
    description,
    agent,
    dependsOn,
    parallelGroup
  };
}

function deployPlan(intent: IntentResult, context: SessionContext): ExecutionPlan {
  const environment = intent.parameters.environment || context.preferredEnvironment || 'staging';

  return {
    summary: `Deploy the current application to ${environment} with validation and verification.`,
    flowName: intent.flow,
    strategy: 'sequential',
    tasks: [
      createTask('validate', 'Validate request', `Confirm deployment target and version for ${environment}.`, 'deploy-agent'),
      createTask('pipeline', 'Trigger CI/CD', 'Start build, test, and deployment pipeline.', 'cicd-agent', ['validate']),
      createTask('verify', 'Verify release', 'Run smoke checks and deployment health verification.', 'deploy-agent', ['pipeline']),
      createTask('report', 'Report outcome', 'Return deployment status and logs to the user.', 'deploy-agent', ['verify'])
    ]
  };
}

function buildPlan(intent: IntentResult): ExecutionPlan {
  return {
    summary: 'Build the application from requirements and validate the generated output.',
    flowName: intent.flow,
    strategy: 'sequential',
    tasks: [
      createTask('analyze', 'Analyze requirements', 'Break down the request into implementation goals.', 'code-agent'),
      createTask('generate', 'Generate code', 'Create or update source files for the requested app.', 'code-agent', ['analyze']),
      createTask('validate', 'Validate output', 'Run validation and test steps on the generated code.', 'code-agent', ['generate']),
      createTask('save', 'Save changes', 'Persist generated work through the version-control path.', 'git-agent', ['validate'])
    ]
  };
}

function updatePlan(intent: IntentResult, context: SessionContext): ExecutionPlan {
  const feature = intent.parameters.feature || context.activeFeature || 'the requested feature';
  const includeDeployment = intent.parameters.includeDeployment === true;

  const tasks: PlannedTask[] = [
    createTask('analyze', 'Analyze change', `Clarify the requested update for ${feature}.`, 'code-agent'),
    createTask('modify', 'Modify code', 'Apply the requested code changes.', 'code-agent', ['analyze']),
    createTask('test', 'Run tests', 'Verify the update with unit and integration checks.', 'cicd-agent', ['modify']),
    createTask('security', 'Run security review', 'Check dependencies and code for security issues.', 'security-agent', ['modify'], 'quality'),
    createTask('save', 'Save versioned changes', 'Commit and push the validated update path.', 'git-agent', ['test', 'security'])
  ];

  if (includeDeployment) {
    tasks.push(
      createTask('deploy', 'Deploy update', 'Deploy the validated update after checks pass.', 'deploy-agent', ['save'])
    );
  }

  return {
    summary: `Update the application to add ${feature}${includeDeployment ? ' and deploy it afterward' : ''}.`,
    flowName: intent.flow,
    strategy: includeDeployment ? 'parallel' : 'sequential',
    tasks
  };
}

function fixPlan(intent: IntentResult): ExecutionPlan {
  return {
    summary: 'Inspect the failure, apply a fix, and verify the system is healthy again.',
    flowName: intent.flow,
    strategy: 'sequential',
    tasks: [
      createTask('analyze', 'Analyze failure', 'Review logs and classify the failure type.', 'debug-agent'),
      createTask('identify', 'Identify root cause', 'Determine the underlying issue and candidate fix.', 'debug-agent', ['analyze']),
      createTask('fix', 'Apply fix', 'Patch the affected code or configuration.', 'debug-agent', ['identify']),
      createTask('verify', 'Verify recovery', 'Re-run tests or pipeline checks after the fix.', 'cicd-agent', ['fix']),
      createTask('save', 'Save recovery work', 'Persist the fix through the version-control path.', 'git-agent', ['verify'])
    ]
  };
}

function testPlan(intent: IntentResult): ExecutionPlan {
  return {
    summary: 'Run the requested test scope and summarize the results.',
    flowName: intent.flow,
    strategy: 'sequential',
    tasks: [
      createTask('run-tests', 'Run tests', 'Execute validation checks for the current build.', 'cicd-agent'),
      createTask('collect-results', 'Collect results', 'Summarize pass/fail status, logs, and artifacts.', 'cicd-agent', ['run-tests'])
    ]
  };
}

function rollbackPlan(intent: IntentResult, context: SessionContext): ExecutionPlan {
  const environment = intent.parameters.environment || context.preferredEnvironment || 'staging';

  return {
    summary: `Rollback the ${environment} environment to the previous healthy version.`,
    flowName: intent.flow,
    strategy: 'sequential',
    tasks: [
      createTask('identify-target', 'Identify rollback target', 'Determine the last known healthy version.', 'deploy-agent'),
      createTask('rollback', 'Rollback deployment', `Restore the previous release in ${environment}.`, 'deploy-agent', ['identify-target']),
      createTask('verify', 'Verify health', 'Confirm the rollback restored a healthy state.', 'deploy-agent', ['rollback'])
    ]
  };
}

function statusPlan(intent: IntentResult): ExecutionPlan {
  return {
    summary: 'Inspect recent activity and summarize the current system state.',
    flowName: intent.flow,
    strategy: 'sequential',
    tasks: [
      createTask('collect-status', 'Collect status', 'Gather recent execution state and system health.', 'cicd-agent'),
      createTask('report', 'Report summary', 'Return a concise activity summary to the user.', 'debug-agent', ['collect-status'])
    ]
  };
}

export function createExecutionPlan(intent: IntentResult, context: SessionContext): ExecutionPlan {
  switch (intent.intent) {
    case IntentType.DEPLOY:
      return deployPlan(intent, context);
    case IntentType.BUILD:
    case IntentType.CREATE:
      return buildPlan(intent);
    case IntentType.UPDATE:
      return updatePlan(intent, context);
    case IntentType.FIX:
      return fixPlan(intent);
    case IntentType.TEST:
      return testPlan(intent);
    case IntentType.ROLLBACK:
      return rollbackPlan(intent, context);
    case IntentType.STATUS:
      return statusPlan(intent);
    default:
      return {
        summary: 'Clarify the request before creating an execution plan.',
        flowName: intent.flow,
        strategy: 'sequential',
        tasks: []
      };
  }
}

export function formatPlanPreview(plan: ExecutionPlan): string {
  if (plan.tasks.length === 0) {
    return 'Plan pending clarification.';
  }

  return plan.tasks
    .slice(0, 4)
    .map((task, index) => `${index + 1}. ${task.title}`)
    .join('\n');
}
