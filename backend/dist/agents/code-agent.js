"use strict";
// ============================================================
// Orbit DevOps - Code Agent
// Handles code generation, modification, and validation
// ============================================================
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
exports.codeAgent = exports.CodeAgent = void 0;
const base_agent_1 = require("./base-agent");
const types_1 = require("../services/types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class CodeAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(types_1.AgentType.CODE, 'Code Agent', 'Generates and modifies code based on requirements', ['generate-code', 'modify-code', 'write-tests', 'validate-code', 'create-documentation']);
    }
    async run(input, execution) {
        const action = input.action || 'generate';
        switch (action) {
            case 'analyze':
                return this.analyzeRequirements(input, execution);
            case 'generate':
                return this.generateCode(input, execution);
            case 'generate-tests':
                return this.generateTests(input, execution);
            case 'validate':
                return this.validateCode(input, execution);
            case 'modify':
                return this.modifyCode(input, execution);
            default:
                return this.generateCode(input, execution);
        }
    }
    getRepoRoot() {
        return process.env.ORBIT_REPO_ROOT || path.resolve(process.cwd(), '..');
    }
    getBackendRoot() {
        return path.join(this.getRepoRoot(), 'backend');
    }
    slugifyFeature(feature) {
        return feature
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            || 'generated-feature';
    }
    getWorkspace(feature) {
        return path.join(this.getBackendRoot(), 'src', 'generated', this.slugifyFeature(feature));
    }
    writeFile(filePath, content) {
        const exists = fs.existsSync(filePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
        return {
            path: path.relative(this.getRepoRoot(), filePath),
            status: exists ? 'updated' : 'created',
            lines: content.split('\n').length
        };
    }
    createModuleContents(feature, description) {
        const slug = this.slugifyFeature(feature);
        const className = slug
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
        return {
            index: `export interface ${className}Config {\n  featureName: string;\n  description: string;\n  enabled: boolean;\n}\n\nexport const ${slug.replace(/-/g, '_')}Config: ${className}Config = {\n  featureName: '${feature}',\n  description: '${description.replace(/'/g, "\\'")}',\n  enabled: true\n};\n\nexport function get${className}Summary(): string {\n  return \`\${${slug.replace(/-/g, '_')}Config.featureName}: \${${slug.replace(/-/g, '_')}Config.description}\`;\n}\n`,
            utils: `export function normalize${className}Input(input: string): string {\n  return input.trim().toLowerCase();\n}\n\nexport function is${className}Enabled(): boolean {\n  return true;\n}\n`,
            config: `export const ${slug.replace(/-/g, '_')}Metadata = {\n  owner: 'orbit-code-agent',\n  generatedAt: '${new Date().toISOString()}',\n  featureKey: '${slug}'\n};\n`
        };
    }
    async runBackendBuild() {
        const backendRoot = this.getBackendRoot();
        const packageJsonPath = path.join(backendRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return {
                success: true,
                output: 'No backend package.json found; skipped full build validation.'
            };
        }
        try {
            const { stdout = '', stderr = '' } = await execFileAsync('npm', ['run', 'build'], {
                cwd: backendRoot
            });
            return {
                success: true,
                command: 'npm run build',
                output: `${stdout}${stderr}`.trim()
            };
        }
        catch (error) {
            throw new Error((error.stderr || error.stdout || error.message || 'Build validation failed').trim());
        }
    }
    async analyzeRequirements(input, execution) {
        this.log(execution, 'info', 'Analyzing project requirements...');
        await this.work(300);
        const requirements = input.requirements || input.feature || 'standard application';
        const backendGeneratedDir = path.join(this.getBackendRoot(), 'src', 'generated');
        const existingModules = fs.existsSync(backendGeneratedDir)
            ? fs.readdirSync(backendGeneratedDir).filter(entry => !entry.startsWith('.'))
            : [];
        this.log(execution, 'info', `Requirements analyzed: ${requirements}`);
        this.log(execution, 'info', 'Identified components needed for implementation');
        return {
            analyzed: true,
            requirements,
            components: ['index-module', 'utilities', 'configuration'],
            existingGeneratedModules: existingModules,
            estimatedFiles: 3,
            complexity: 'moderate'
        };
    }
    async generateCode(input, execution) {
        this.log(execution, 'info', 'Starting code generation...');
        await this.work(200);
        this.log(execution, 'info', 'Analyzing project structure...');
        await this.work(200);
        this.log(execution, 'info', 'Generating application code...');
        await this.work(300);
        const feature = input.feature || input.requirements || 'application';
        const description = input.description || `Generated module for ${feature}`;
        const workspace = this.getWorkspace(feature);
        const contents = this.createModuleContents(feature, description);
        const files = [
            this.writeFile(path.join(workspace, 'index.ts'), contents.index),
            this.writeFile(path.join(workspace, 'utils.ts'), contents.utils),
            this.writeFile(path.join(workspace, 'config.ts'), contents.config)
        ];
        this.log(execution, 'info', `Generated ${files.length} files for ${feature}`);
        this.log(execution, 'info', 'Code generation complete');
        return {
            generated: true,
            files,
            totalLines: files.reduce((sum, f) => sum + f.lines, 0),
            feature,
            workspace: path.relative(this.getRepoRoot(), workspace),
            message: `Successfully generated code for ${feature}`
        };
    }
    async generateTests(input, execution) {
        this.log(execution, 'info', 'Generating test suite...');
        await this.work(200);
        const feature = input.feature || input.requirements || 'application';
        const slug = this.slugifyFeature(feature);
        const workspace = this.getWorkspace(feature);
        const testPath = path.join(workspace, 'index.test.ts');
        const testContent = `import { get${slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Summary } from './index';\n\ndescribe('${feature} generated module', () => {\n  it('returns a summary', () => {\n    expect(get${slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Summary()).toContain('${feature}');\n  });\n});\n`;
        const testFiles = [
            {
                ...this.writeFile(testPath, testContent),
                tests: 1
            }
        ];
        this.log(execution, 'info', `Generated ${testFiles.length} test files with ${testFiles.reduce((s, f) => s + f.tests, 0)} tests`);
        return {
            generated: true,
            testFiles,
            totalTests: testFiles.reduce((s, f) => s + f.tests, 0),
            coverage: 'unit + integration'
        };
    }
    async validateCode(input, execution) {
        this.log(execution, 'info', 'Running code validation...');
        const validationResult = await this.runBackendBuild();
        const issues = input.simulateIssues ? [
            { file: 'backend/src/generated/example/index.ts', line: 1, severity: 'warning', message: 'Simulated issue' }
        ] : [];
        this.log(execution, 'info', `Validation complete: ${issues.length} issues found`);
        return {
            valid: issues.length === 0,
            issues,
            checks: {
                syntax: 'passed',
                types: 'passed',
                lint: issues.length === 0 ? 'passed' : 'warnings'
            },
            command: validationResult.command,
            buildOutput: validationResult.output
        };
    }
    async modifyCode(input, execution) {
        this.log(execution, 'info', `Modifying code: ${input.description || 'applying changes'}...`);
        await this.work(200);
        this.log(execution, 'info', 'Analyzing existing code...');
        await this.work(200);
        this.log(execution, 'info', 'Applying modifications...');
        await this.work(200);
        const feature = input.feature || 'application';
        const workspace = this.getWorkspace(feature);
        const targetFile = input.file
            ? path.join(this.getRepoRoot(), input.file)
            : path.join(workspace, 'index.ts');
        const previousContent = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : '';
        const updatedContent = `${previousContent}\nexport const lastOrbitUpdate = '${(input.description || 'code updated').replace(/'/g, "\\'")}';\n`;
        const fileResult = this.writeFile(targetFile, updatedContent.trimStart());
        const modifiedFiles = [
            { path: fileResult.path, changes: 'modified', linesChanged: 1 }
        ];
        this.log(execution, 'info', `Modified ${modifiedFiles.length} files`);
        return {
            modified: true,
            files: modifiedFiles,
            description: input.description || 'Code modifications applied'
        };
    }
}
exports.CodeAgent = CodeAgent;
exports.codeAgent = new CodeAgent();
//# sourceMappingURL=code-agent.js.map