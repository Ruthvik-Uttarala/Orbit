import { FlowExecution, PipelineSummary, SessionContext } from './types';
export interface StatusSnapshot {
    message: string;
    latestExecution?: FlowExecution;
    latestPipeline?: PipelineSummary;
}
export declare function buildStatusSummary(context?: SessionContext): Promise<StatusSnapshot>;
//# sourceMappingURL=status-summary.d.ts.map