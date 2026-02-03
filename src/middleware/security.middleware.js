import helmet from 'helmet';
import DOMPurify from 'isomorphic-dompurify';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import AppError from '../utils/AppError.js';
import Logger from '../utils/logger.js';
import { HTTP_STATUS } from '../constants.js';

import env from '../config/env.js';
import systemConfig from '../utils/systemConfig.js';

/**
 * Enterprise Security Middleware Configuration
 * Implements strict CSP, Sanitization, CORS Whitelisting, and Rate Limiting.
 */
const securityMiddleware = (app) => {
  // 1. Set security HTTP headers with strict CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
  }));

  // 2. DOMPurify Sanitization Middleware (Prevention of XSS in Request Body)
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = DOMPurify.sanitize(obj[key]);
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      };
      sanitizeObject(req.body);
    }
    next();
  });

  // 3. CORS configuration - Enterprise Whitelist approach
  const whitelist = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Normalize origin (Remove trailing slashes)
        const normalizedOrigin = origin.replace(/\/$/, "");
        const isWhitelisted = whitelist.includes(normalizedOrigin) || whitelist.includes(origin);
        const isDevelopment = env.NODE_ENV === 'development';

        if (isWhitelisted || isDevelopment) {
          callback(null, true);
        } else {
          // Log violation with full context
          Logger.error(`🚨 CORS VIOLATION: Origin "${origin}" is not authorized`, {
            blockedOrigin: origin,
            allowedWhitelist: whitelist,
            environment: env.NODE_ENV
          });
          callback(new AppError(`Access Denied by CORS Policy. Origin "${origin}" is not whitelisted.`, HTTP_STATUS.FORBIDDEN, 'CORS_ERROR'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'X-Request-ID',
        'X-Refresh-Token',
        'X-CSRF-Token',
        'X-User-Agent',
        'X-App-Version',
        'X-Client-Platform'
      ],
      exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Request-ID',
        'X-CSRF-Token'
      ],
      credentials: true,
      optionsSuccessStatus: 200, // Legacy browser support
      maxAge: 86400, // Cache preflight for 24 hours
    })
  );

  // 4. Prevent parameter pollution (e.g., ?id=1&id=2)
  app.use(hpp());

  // 5. Rate limiting
  const limiter = rateLimit({
    max: 10000, // Enterprise scale: Limit each IP per window
    windowMs: 60 * 60 * 1000, // 1 hour
    message: {
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: 'Too many requests from this IP, please try again in an hour!',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { trustProxy: false }, // Suppress trust proxy validation warning on Render
  });

  app.use('/api', limiter);

  // 6. Environment Enforcement Middleware
  app.use(async (req, res, next) => {
    try {
      const isLive = await systemConfig.isLiveMode();
      const isProdEnv = env.NODE_ENV === 'production';

      // If appMode is 'Live', it MUST be in production environment
      if (isLive && !isProdEnv) {
        Logger.error(`🚫 ACCESS BLOCKED: SYSTEM IN LIVE MODE BUT RUNNING IN ${env.NODE_ENV.toUpperCase()} ENVIRONMENT`);

        return next(new AppError(
          'Service Unavailable: This application is in Live mode but running in a development environment. Please contact administrator.',
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          'ENVIRONMENT_MISMATCH'
        ));
      }

      // If in Dev mode, we allow both development and production environments
      next();
    } catch (error) {
      Logger.error('Environment enforcement check failed:', error);
      next(); // Fail open for safety or closed for security? Choosing open for now to avoid bricking.
    }
  });
};

export default securityMiddleware;
