import Logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request using enterprise logger
  Logger.logRequest(req);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.logResponse(req, res, duration);
  });

  next();
};
