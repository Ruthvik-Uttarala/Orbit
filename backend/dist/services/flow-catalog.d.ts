import { FlowDefinition } from './types';
export interface FlowTriggerEvent {
    type: string;
    action?: string;
    endpoint?: string;
    project?: string;
    ref?: string;
}
export interface FlowCatalogItem {
    fileName: string;
    definition: FlowDefinition;
}
export declare function findFlowsDirectory(): string | null;
export declare function loadFlowCatalog(): FlowCatalogItem[];
export declare function resolveFlowsForTrigger(triggerEvent: FlowTriggerEvent): FlowCatalogItem[];
//# sourceMappingURL=flow-catalog.d.ts.map