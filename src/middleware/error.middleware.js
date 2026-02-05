import { HTTP_STATUS, ERROR_MESSAGES, ENV } from '../constants.js';
import AppError from '../utils/AppError.js';
import Logger from '../utils/logger.js';
import systemConfig from '../utils/systemConfig.js';
import * as Sentry from '@sentry/node';

const errorHandler = async (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    // Handle Mongoose Duplicate Key Error (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = `Duplicate field value: ${field}. Please use another value!`;
      error = new AppError(message, HTTP_STATUS.CONFLICT, 'DUPLICATE_KEY_ERROR', [], true);
    } else {
      const statusCode = error.statusCode || (error.name === 'ValidationError' ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR);
      const message = error.message || ERROR_MESSAGES.INTERNAL_ERROR;
      error = new AppError(message, statusCode, 'INTERNAL_ERROR', err?.errors || [], false, err.stack);
    }
  }

  const isDebug = await systemConfig.isDebugEnabled();

  // Enterprise: Mask internal error messages in production if not in debug mode
  let message = error.message;
  if (!isDebug && !error.isOperational) {
    message = ERROR_MESSAGES.INTERNAL_ERROR;
  }

  const response = {
    ...error,
    message: message,
    ...(isDebug ? { stack: error.stack } : {}),
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
