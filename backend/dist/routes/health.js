"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
exports.healthRouter = (0, express_1.Router)();
// Health check endpoint
exports.healthRouter.get('/', (req, res) => {
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
exports.healthRouter.get('/ready', (req, res) => {
    res.json({
        ready: true,
        timestamp: new Date().toISOString()
    });
});
//# sourceMappingURL=health.js.map