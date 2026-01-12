/**
 * Enterprise-grade Error Utility
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', errors = [], isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
