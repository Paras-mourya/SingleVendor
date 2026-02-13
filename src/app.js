import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import responseTime from 'response-time';

// 1. Load and Validate Env (Fail-Fast)
import env from './config/env.js';

// 2. Monitoring (Sentry must be first)
import { setupExpressErrorHandler } from '../instrument.js';

// Configs
import { setupSwagger } from './config/swagger.js';

// Middlewares
import { requestIdMiddleware } from './middleware/requestId.js';
import { contextMiddleware } from './middleware/context.middleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { responseHandler } from './middleware/response.middleware.js';
import securityMiddleware from './middleware/security.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// Routes
import v1Routes from './routes/v1.routes.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

// Enable trust proxy for express-rate-limit (Render usage)
app.set('trust proxy', 1);

// 1. Elite Security Stack (Must be first to handle CORS preflights)
securityMiddleware(app);

/**
 * PRODUCTION-GRADE MIDDLEWARE STACK
 */
app.set('etag', 'strong'); // Enable strong ETags for reliable caching

// 2. Performance Middlewares
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression({ level: 6, threshold: 1024 })); // Optimize compression
app.use(responseTime());

// Global Identifiers & Context
app.use(requestIdMiddleware);
app.use(contextMiddleware);
app.use(requestLogger);

// Global Response Formatter (Senior/Principal Pattern)
app.use(responseHandler);

// Documentation
setupSwagger(app);

/**
 * ROUTE REGISTRATION (Versioned)
 */
app.use('/health', healthRoutes); // Health is usually top-level
app.use('/api/v1', v1Routes);

// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Single Vendor Backend API',
        status: 'ONLINE',
        version: '1.0.0',
        docs: '/api-docs'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        message: `Cannot find ${req.originalUrl} on this server!`
    });
});

/**
 * PRODUCTION-GRADE ERROR HANDLING
 */
if (setupExpressErrorHandler) setupExpressErrorHandler(app);
app.use(errorHandler);

export default app;
