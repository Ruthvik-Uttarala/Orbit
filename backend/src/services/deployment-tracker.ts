import { flowOrchestrator } from './orchestrator';
import {
  DeploymentExecutionStatus,
  DeploymentStatusSnapshot,
  DeploymentStepEvent,
  DeploymentStepName,
  DeploymentStepState,
  DeploymentStepStatus,
  FlowExecution,
  FlowStatus
} from './types';

const DEPLOYMENT_STEPS: DeploymentStepName[] = [
  'Validate request',
  'Trigger CI/CD',
  'Verify release',
  'Report outcome'
];

class DeploymentTracker {
  private deploymentStatusMap: Map<string, DeploymentStatusSnapshot> = new Map();

  constructor() {
    flowOrchestrator.onDeploymentEvent((event: DeploymentStepEvent) => {
      this.handleDeploymentStepEvent(event);
    });
  }

  initializeDeployment(deploymentId: string): DeploymentStatusSnapshot {
    return this.ensureDeploymentSnapshot(deploymentId);
  }

  getDeploymentStatus(deploymentId: string, execution?: FlowExecution): DeploymentStatusSnapshot | undefined {
    const snapshot = this.deploymentStatusMap.get(deploymentId);
    if (!snapshot) {
      return undefined;
    }

    if (execution && execution.flowName === 'deploy-flow') {
      this.syncWithExecution(snapshot, execution);
    }

    return this.cloneSnapshot(snapshot);
  }

  private handleDeploymentStepEvent(event: DeploymentStepEvent): void {
    const snapshot = this.ensureDeploymentSnapshot(event.deploymentId);
    const step = snapshot.steps.find(existing => existing.name === event.step);

    if (!step) {
      return;
    }

    if (!this.shouldApplyTransition(step.status, event.status)) {
      if (event.message) {
        step.message = event.message;
        step.timestamp = event.timestamp;
      }
      return;
    }

    step.status = event.status;
    step.message = event.message || step.message;
    step.timestamp = event.timestamp;

    this.updateSnapshotStatus(snapshot);
  }

  private ensureDeploymentSnapshot(deploymentId: string): DeploymentStatusSnapshot {
    const existing = this.deploymentStatusMap.get(deploymentId);
    if (existing) {
      return existing;
    }

    const snapshot: DeploymentStatusSnapshot = {
      status: 'running',
      progress: 0,
      steps: DEPLOYMENT_STEPS.map(step => ({
        name: step,
        status: 'pending',
        message: 'Pending',
        timestamp: Date.now()
      }))
    };

    this.deploymentStatusMap.set(deploymentId, snapshot);
    return snapshot;
  }

  private shouldApplyTransition(current: DeploymentStepStatus, next: DeploymentStepStatus): boolean {
    if (current === 'failed' && next !== 'completed') {
      return false;
    }

    if (current === 'completed' && (next === 'running' || next === 'pending')) {
      return false;
    }

    if (current === 'running' && next === 'pending') {
      return false;
    }

    return true;
  }

  private updateSnapshotStatus(snapshot: DeploymentStatusSnapshot): void {
    const hasFailed = snapshot.steps.some(step => step.status === 'failed');
    const allCompleted = snapshot.steps.every(step => step.status === 'completed');

    if (hasFailed) {
      snapshot.status = 'failed';
    } else if (allCompleted) {
      snapshot.status = 'success';
    } else {
      snapshot.status = 'running';
    }

    snapshot.progress = this.calculateProgress(snapshot.steps, snapshot.status);
  }

  private calculateProgress(
    steps: DeploymentStepState[],
    status: DeploymentExecutionStatus
  ): number {
    if (status === 'success') {
      return 100;
    }

    let milestone = 0;
    steps.forEach((step, index) => {
      const stepStart = index * 25;
      const stepEnd = (index + 1) * 25;

      if (step.status === 'completed') {
        milestone = Math.max(milestone, stepEnd);
      } else if (step.status === 'running' || step.status === 'failed') {
        milestone = Math.max(milestone, stepStart);
      }
    });

    return Math.min(100, milestone);
  }

  private syncWithExecution(snapshot: DeploymentStatusSnapshot, execution: FlowExecution): void {
    const output = execution.result?.output || {};
    const deploymentUrl = typeof output.url === 'string' ? output.url : undefined;

    snapshot.result = {
      ...snapshot.result,
      message: execution.result?.userMessage || execution.error || snapshot.result?.message,
      deploymentUrl: deploymentUrl || snapshot.result?.deploymentUrl,
      pipelineUrl: execution.latestPipeline?.url || snapshot.result?.pipelineUrl,
      pipelineStatus: execution.latestPipeline?.status || snapshot.result?.pipelineStatus,
      completedAt: execution.endTime || snapshot.result?.completedAt
    };

    if (execution.status === FlowStatus.COMPLETED) {
      const completionMessage = execution.result?.userMessage || 'Deployment completed successfully';
      snapshot.steps = snapshot.steps.map(step => ({
        ...step,
        status: 'completed',
        message: step.message && step.message !== 'Pending' ? step.message : completionMessage,
        timestamp: Date.now()
      }));
      snapshot.status = 'success';
      snapshot.progress = 100;
      return;
    }

    if (execution.status === FlowStatus.FAILED) {
      const failureMessage = execution.error || execution.result?.message || 'Deployment failed';
      const firstNonFinal = snapshot.steps.find(step => step.name !== 'Report outcome' && step.status === 'running')
        || snapshot.steps.find(step => step.name !== 'Report outcome' && step.status === 'pending');

      if (firstNonFinal) {
        firstNonFinal.status = 'failed';
        firstNonFinal.message = failureMessage;
        firstNonFinal.timestamp = Date.now();
      }

      const reportStep = snapshot.steps.find(step => step.name === 'Report outcome');
      if (reportStep) {
        reportStep.status = 'failed';
        reportStep.message = failureMessage;
        reportStep.timestamp = Date.now();
      }

      snapshot.status = 'failed';
      snapshot.progress = this.calculateProgress(snapshot.steps, snapshot.status);
      return;
    }

    this.updateSnapshotStatus(snapshot);
  }

  private cloneSnapshot(snapshot: DeploymentStatusSnapshot): DeploymentStatusSnapshot {
    return {
      status: snapshot.status,
      progress: snapshot.progress,
      steps: snapshot.steps.map(step => ({ ...step })),
      result: snapshot.result ? { ...snapshot.result } : undefined
    };
  }
}

export const deploymentTracker = new DeploymentTracker();
