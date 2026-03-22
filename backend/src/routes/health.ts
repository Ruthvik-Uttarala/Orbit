import { Router, Request, Response } from 'express';

export const healthRouter = Router();

// Health check endpoint
healthRouter.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'ok',
      gitlab: process.env.GITLAB_TOKEN ? 'configured' : 'not_configured'
    }
  });
});

healthRouter.get('/ready', (req: Request, res: Response) => {
  res.json({
    ready: true,
    timestamp: new Date().toISOString()
  });
});
