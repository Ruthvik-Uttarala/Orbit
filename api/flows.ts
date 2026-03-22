// ============================================================
// Orbit DevOps - Flows Endpoint (Vercel Serverless)
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Import orchestrator - using require for serverless compatibility
const orchestratorModule = require('../backend/src/services/orchestrator');
const types = require('../backend/src/services/types');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // GET /api/flows - List all flow executions
  if (method === 'GET') {
    // Check if this is a status request - /api/flows/status/:id
    const pathParts = req.url?.split('/') || [];
    const statusIndex = pathParts.indexOf('status');
    const logsIndex = pathParts.indexOf('logs');
    
    if (statusIndex !== -1 && pathParts[statusIndex + 1]) {
      // Get flow status - /api/flows/status/:id
      const executionId = pathParts[statusIndex + 1];
      const execution = orchestratorModule.flowOrchestrator.getExecution(executionId);
      
      if (!execution) {
        res.status(404).json({ error: 'Flow execution not found' });
        return;
      }
      
      // Convert logs to plain strings for frontend
      const displayLogs = execution.logs.map((log: any) => {
        if (typeof log === 'string') return log;
        return log.message;
      });
      
      res.json({
        ...execution,
        logs: displayLogs
      });
    } else if (logsIndex !== -1 && pathParts[logsIndex + 1]) {
      // Get flow logs - /api/flows/logs/:id
      const executionId = pathParts[logsIndex + 1];
      const execution = orchestratorModule.flowOrchestrator.getExecution(executionId);
      
      if (!execution) {
        res.status(404).json({ error: 'Flow execution not found' });
        return;
      }
      
      const logs = execution.logs.map((log: any) => {
        if (typeof log === 'string') return log;
        return log.message;
      });
      
      res.json({ logs });
    } else {
      // List all flow executions - /api/flows
      const executions = orchestratorModule.flowOrchestrator.getAllExecutions();
      
      // Convert logs to plain strings
      const displayExecutions = executions.map((exec: any) => ({
        ...exec,
        logs: exec.logs.map((log: any) => typeof log === 'string' ? log : log.message)
      }));
      
      res.json({ executions: displayExecutions });
    }
  } 
  // GET /api/flows/definitions - Get all flow definitions
  else if (method === 'GET' && req.url?.includes('definitions')) {
    try {
      // Try multiple paths for flows directory
      const possiblePaths = [
        path.join(process.cwd(), 'flows'),
        path.join(process.cwd(), '..', 'flows'),
        path.join(__dirname, '..', '..', 'flows'),
        path.join(process.cwd(), '..', '..', '..', 'flows')
      ];
      
      let flowsDir = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          flowsDir = p;
          break;
        }
      }
      
      if (!flowsDir) {
        res.json({ flows: [] });
        return;
      }
      
      const files = fs.readdirSync(flowsDir).filter((f: string) => f.endsWith('.yaml'));
      
      const definitions = files.map((file: string) => {
        try {
          const content = fs.readFileSync(path.join(flowsDir, file), 'utf-8');
          const parsed = yaml.load(content);
          return {
            name: parsed.name,
            version: parsed.version,
            description: parsed.description,
            triggers: parsed.triggers,
            stages: parsed.stages?.map((s: any) => s.name) || []
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      res.json({ flows: definitions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load flow definitions', details: (error as Error).message });
    }
  }
  // POST /api/flows/trigger - Trigger a flow execution
  else if (method === 'POST') {
    try {
      const { flowName, parameters } = req.body;
      
      if (!flowName) {
        res.status(400).json({ error: 'flowName is required' });
        return;
      }
      
      const executionId = uuidv4();
      
      // Start flow execution asynchronously
      orchestratorModule.flowOrchestrator.executeFlow(executionId, flowName, parameters || {})
        .then((result: any) => {
          console.log(`[Flow] ${flowName} completed: ${result.success}`);
        })
        .catch((error: any) => {
          console.error(`[Flow] ${flowName} error:`, error);
        });
      
      res.status(202).json({
        executionId,
        status: types.FlowStatus.PENDING,
        message: 'Flow execution started'
      });
    } catch (error) {
      console.error('[Flow] Trigger error:', error);
      res.status(500).json({ 
        error: 'Failed to trigger flow', 
        details: (error as Error).message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
