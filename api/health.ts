// ============================================================
// Orbit DevOps - Health Check Endpoint (Vercel Serverless)
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Health check endpoint
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'ok',
      gitlab: process.env.GITLAB_TOKEN ? 'configured' : 'not_configured'
    }
  });
}
