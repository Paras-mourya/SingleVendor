import RequestContext from '../utils/context.js';

/**
 * Context Middleware
 * Initializes the RequestContext for each request.
 */
export const contextMiddleware = (req, res, next) => {
  const contextData = {
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
  };

  RequestContext.run(contextData, () => {
    next();
  });
};
