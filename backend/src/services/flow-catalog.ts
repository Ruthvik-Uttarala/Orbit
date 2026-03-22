import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
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

function getPossibleFlowPaths(): string[] {
  return [
    path.join(process.cwd(), 'flows'),
    path.join(process.cwd(), '..', 'flows'),
    path.join(__dirname, '..', '..', 'flows')
  ];
}

export function findFlowsDirectory(): string | null {
  for (const candidate of getPossibleFlowPaths()) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function loadFlowCatalog(): FlowCatalogItem[] {
  const flowsDir = findFlowsDirectory();
  if (!flowsDir) {
    return [];
  }

  return fs.readdirSync(flowsDir)
    .filter(fileName => fileName.endsWith('.yaml'))
    .map(fileName => {
      const filePath = path.join(flowsDir, fileName);
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        fileName,
        definition: yaml.load(content) as FlowDefinition
      };
    });
}

export function resolveFlowsForTrigger(triggerEvent: FlowTriggerEvent): FlowCatalogItem[] {
  return loadFlowCatalog().filter(({ definition }) => {
    return definition.triggers?.some(trigger => {
      if (trigger.type !== triggerEvent.type) {
        return false;
      }

      if (triggerEvent.action && trigger.action && trigger.action !== triggerEvent.action) {
        return false;
      }

      if (triggerEvent.endpoint && trigger.endpoint && trigger.endpoint !== triggerEvent.endpoint) {
        return false;
      }

      if (triggerEvent.project && trigger.project && trigger.project !== triggerEvent.project) {
        return false;
      }

      if (triggerEvent.ref && trigger.ref && trigger.ref !== triggerEvent.ref) {
        return false;
      }

      return true;
    }) ?? false;
  });
}
