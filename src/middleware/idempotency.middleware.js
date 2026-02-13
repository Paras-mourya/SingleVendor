import crypto from 'crypto';
import Cache from '../utils/cache.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import Logger from '../utils/logger.js';

/**
 * Idempotency Middleware (Double Hit Prevention)
 * Locks a specific request for a user for a short duration.
 * @param {number} ttl - Lock duration in seconds (default 5s)
 */
const lockRequest = (ttl = 5) => {
  return async (req, res, next) => {
    // Only apply to state-changing methods (POST, PATCH, PUT, DELETE)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // 1. Determine Idempotency Key
    // Priority: X-Idempotency-Key header > hash(userId + path + body)
    const idempotencyKey = req.headers['x-idempotency-key'];
    let lockKey;

    if (idempotencyKey) {
      lockKey = `lock:header:${idempotencyKey}`;
    } else {
      const userId = req.user?._id || req.admin?._id || 'guest';
      const bodyHash = crypto
        .createHash('md5')
        .update(JSON.stringify(req.body || {}))
        .digest('hex');
      lockKey = `lock:auto:${userId}:${req.originalUrl}:${bodyHash}`;
    }

    try {
      // 2. Check if lock exists in Redis
      const isLocked = await Cache.get(lockKey);

      if (isLocked) {
        Logger.warn(`Double-hit prevented: ${lockKey}`);
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(
          new ApiResponse(
            HTTP_STATUS.TOO_MANY_REQUESTS,
            null,
            'Request is already being processed. Please wait a moment.'
          )
        );
      }

      // 3. Set lock for TTL (seconds)
      // Implementation: We use a simple value '1' to indicate locked
      await Cache.set(lockKey, 'locked', ttl);

      // 4. Auto-cleanup lock after response completes (success or error)
      let cleanupDone = false;
      const cleanupLock = async () => {
        if (cleanupDone) return; // Prevent duplicate cleanup
        cleanupDone = true;

        try {
          await Cache.del(lockKey);
          Logger.debug(`Lock released: ${lockKey}`);
        } catch (err) {
          Logger.error('Lock cleanup failed', { error: err.message });
        }

        // Remove both listeners to prevent memory leaks
        res.removeListener('finish', cleanupLock);
        res.removeListener('close', cleanupLock);
      };

      // Listen for response completion
      res.on('finish', cleanupLock);
      res.on('close', cleanupLock);

      // 5. Proceed to next
      next();
    } catch (error) {
      Logger.error('Idempotency Middleware Error', { error: error.message });
      next(); // Don't block if cache fails, but log it
    }
  };
};

export { lockRequest };
export default lockRequest;
