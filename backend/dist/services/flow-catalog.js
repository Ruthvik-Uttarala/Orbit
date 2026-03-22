"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFlowsDirectory = findFlowsDirectory;
exports.loadFlowCatalog = loadFlowCatalog;
exports.resolveFlowsForTrigger = resolveFlowsForTrigger;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
function getPossibleFlowPaths() {
    return [
        path.join(process.cwd(), 'flows'),
        path.join(process.cwd(), '..', 'flows'),
        path.join(__dirname, '..', '..', 'flows')
    ];
}
function findFlowsDirectory() {
    for (const candidate of getPossibleFlowPaths()) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}
function loadFlowCatalog() {
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
            definition: yaml.load(content)
        };
    });
}
function resolveFlowsForTrigger(triggerEvent) {
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
//# sourceMappingURL=flow-catalog.js.map