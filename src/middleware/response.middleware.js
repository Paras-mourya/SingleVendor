import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Enterprise Response Normalization Middleware
 * Intercepts res.json to ensure every response follows the { success, message, data, statusCode } pattern.
 */
export const responseHandler = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    // If it's already an ApiResponse, just send it
    if (body instanceof ApiResponse) {
      return originalJson.call(this, body);
    }

    // If it's an error (handled by error middleware), skip normalization here
    if (body && body.success === false && body.statusCode >= 400) {
      return originalJson.call(this, body);
    }

    // Wrap the response
    const statusCode = res.statusCode || 200;
    const normalizedBody = new ApiResponse(
      statusCode,
      body,
      res.statusMessage || 'Success'
    );

    return originalJson.call(this, normalizedBody);
  };

  next();
};
