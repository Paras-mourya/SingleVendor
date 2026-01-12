import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Enterprise Zod Validation Middleware
 * Transforms Zod errors into standardized ApiError format.
 */
const validate = (schema) => (req, res, next) => {
  try {
    const validData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace req data with validated and parsed data (important for type coercion)
    req.body = validData.body;
    req.query = validData.query;
    req.params = validData.params;

    next();
  } catch (error) {
    const errors = error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));

    next(new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', errors));
  }
};

export default validate;
