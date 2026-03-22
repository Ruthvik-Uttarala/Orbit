// ============================================================
// Orbit DevOps - Backend API Server
// Main entry point for the Orbit DevOps platform
// ============================================================

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { flowsRouter } from './routes/flows';
import { deployRouter } from './routes/deploy';
import { agentsRouter } from './routes/agents';
import { healthRouter } from './routes/health';
import { intentRouter } from './routes/intent';
import { orbitRouter } from './routes/orbit';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  (req as any).requestId = requestId;
  logger.info({
    requestId,
    method: req.method,
    path: req.path
  });
  next();
});

// Health check endpoint
app.use('/api/health', healthRouter);

// Intent / Chat endpoint (Phase 4)
app.use('/api/intent', intentRouter);

// Flow management endpoints
app.use('/api/flows', flowsRouter);

// Deploy endpoints
app.use('/api/deploy', deployRouter);

// Agent execution endpoints
app.use('/api/agents', agentsRouter);

// Orbit dashboard endpoints
app.use('/api/orbit', orbitRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Orbit DevOps API',
    version: '1.0.0',
    status: 'running',
    description: 'AI-native DevOps platform with multi-agent orchestration',
    endpoints: {
      health: '/api/health',
      intent: '/api/intent',
      flows: '/api/flows',
      deploy: '/api/deploy',
      agents: '/api/agents'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    requestId: (req as any).requestId,
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    error: 'Something went wrong',
    message: err.message || 'An internal error occurred. Please try again.',
    requestId: (req as any).requestId
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Orbit DevOps API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Endpoints: health, intent, flows, deploy, agents`);
  });
}

export default app;
