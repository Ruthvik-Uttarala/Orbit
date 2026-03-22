"use strict";
// ============================================================
// Orbit DevOps - Backend API Server
// Main entry point for the Orbit DevOps platform
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const winston_1 = __importDefault(require("winston"));
const flows_1 = require("./routes/flows");
const deploy_1 = require("./routes/deploy");
const agents_1 = require("./routes/agents");
const health_1 = require("./routes/health");
const intent_1 = require("./routes/intent");
const orbit_1 = require("./routes/orbit");
// Load environment variables
dotenv_1.default.config();
// Configure logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logging middleware
app.use((req, _res, next) => {
    const requestId = (0, uuid_1.v4)();
    req.requestId = requestId;
    logger.info({
        requestId,
        method: req.method,
        path: req.path
    });
    next();
});
// Health check endpoint
app.use('/api/health', health_1.healthRouter);
// Intent / Chat endpoint (Phase 4)
app.use('/api/intent', intent_1.intentRouter);
// Flow management endpoints
app.use('/api/flows', flows_1.flowsRouter);
// Deploy endpoints
app.use('/api/deploy', deploy_1.deployRouter);
// Agent execution endpoints
app.use('/api/agents', agents_1.agentsRouter);
// Orbit dashboard endpoints
app.use('/api/orbit', orbit_1.orbitRouter);
// Root endpoint
app.get('/', (_req, res) => {
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
app.use((err, req, res, _next) => {
    logger.error({
        requestId: req.requestId,
        error: err.message,
        stack: err.stack
    });
    res.status(500).json({
        error: 'Something went wrong',
        message: err.message || 'An internal error occurred. Please try again.',
        requestId: req.requestId
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
exports.default = app;
//# sourceMappingURL=index.js.map