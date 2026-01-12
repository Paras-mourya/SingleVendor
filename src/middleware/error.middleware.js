import { HTTP_STATUS, ERROR_MESSAGES, ENV } from '../constants.js';
import AppError from '../utils/AppError.js';
import Logger from '../utils/logger.js';
import * as Sentry from '@sentry/node';

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR);
    const message = error.message || ERROR_MESSAGES.INTERNAL_ERROR;
    error = new AppError(message, statusCode, 'INTERNAL_ERROR', err?.errors || [], false, err.stack);
  }

  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === ENV.DEVELOPMENT ? { stack: error.stack } : {}),
  };

  // Enterprise: Log error with detailed context
  Logger.logError(error, req);

  // Enterprise: Capture in Sentry if operational or unexpected
  if (!error.isOperational || error.statusCode >= 500) {
    Sentry.captureException(err, {
      user: req.user ? { id: req.user._id, email: req.user.email } : undefined,
      extra: {
        requestId: req.requestId,
        path: req.originalUrl,
        body: req.body,
      }
    });
  }

  res.status(error.statusCode).json(response);
};

export { errorHandler };
