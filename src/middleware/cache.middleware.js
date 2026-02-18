import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';

/**
 * Enterprise Cache Middleware with Multi-Layer Support
 * Implements Cache-Aside and Write-Through patterns
 * @param {number} ttl - Time to live in seconds (default 1 hour)
 * @param {Function} keyGenerator - Custom key generator function
 */
const cacheMiddleware = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : generateDefaultKey(req);

    try {
      // Try to get from multi-layer cache (L1 -> L2 -> DB)
      const cachedResponse = await MultiLayerCache.get(cacheKey);
      if (cachedResponse) {
        Logger.debug(`Multi-Layer Cache Hit: ${cacheKey}`);
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Layer', cachedResponse.fromL1 ? 'L1' : 'L2');
        res.set('X-Cache-Key', cacheKey);
        
        return res.status(cachedResponse.status || 200).json(cachedResponse.data);
      }

      // Override res.json to cache the response (Write-Through Pattern)
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseToCache = {
            status: res.statusCode,
            data: data,
            timestamp: Date.now()
          };

          // Cache in both layers
          MultiLayerCache.set(cacheKey, responseToCache, ttl).catch(error => {
            Logger.error('Multi-Layer Cache Set Error', { error: error.message, cacheKey });
          });

          Logger.debug(`Multi-Layer Cache Set: ${cacheKey} (TTL: ${ttl}s)`);
        }

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      Logger.error('Multi-Layer Cache Middleware Error', { error: error.message, cacheKey });
      next();
    }
  };
};

/**
 * Default cache key generator
 */
const generateDefaultKey = (req) => {
  // Enterprise Key Strategy: Use specific prefixes based on authentication context
  const customerId = req.customer?._id || (req.user && !req.admin ? req.user._id : null);
  const adminId = req.admin?._id;

  let key = `response:${req.originalUrl || req.url}:${JSON.stringify(req.query)}:${JSON.stringify(req.params)}`;

  if (adminId) {
    key = `response:admin:${adminId}:${req.originalUrl}:${JSON.stringify(req.query)}`;
  } else if (customerId) {
    key = `response:customer:${customerId}:${req.originalUrl}:${JSON.stringify(req.query)}`;
  }

  return key;
};

/**
 * Admin Profile Cache Middleware
 * Specialized for admin profile endpoints
 */
export const adminProfileCache = (ttl = 1800) => {
  return cacheMiddleware(ttl, (req) => {
    const adminId = req.admin?._id || req.params?.id || req.query?.id;
    return adminId ? `admin:profile:${adminId}` : `admin:profile:anonymous:${req.originalUrl}`;
  });
};

/**
 * Admin List Cache Middleware
 * For paginated admin lists with query-based cache keys
 */
export const adminListCache = (ttl = 900) => {
  return cacheMiddleware(ttl, (req) => {
    const { page = 1, limit = 10, search = '', status = '', role = '' } = req.query;
    return `admin:list:${page}:${limit}:${search}:${status}:${role}`;
  });
};

/**
 * Dynamic Cache Middleware
 * Creates cache key based on user role and ID
 */
export const dynamicCache = (ttl = 3600, prefix = 'dynamic') => {
  return cacheMiddleware(ttl, (req) => {
    const userId = req.user?._id || req.admin?._id || req.customer?._id || 'anonymous';
    const userRole = req.user?.role || req.admin?.role || req.customer?.role || 'guest';
    return `${prefix}:${userRole}:${userId}:${req.originalUrl}:${JSON.stringify(req.query)}`;
  });
};

/**
 * Cache Invalidation Middleware
 * Invalidates cache patterns after successful mutations
 */
export const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache patterns asynchronously
        patterns.forEach(async pattern => {
          try {
            // Support dynamic pattern generation
            const resolvedPattern = typeof pattern === 'function' ? pattern(req) : pattern;
            await MultiLayerCache.delByPattern(resolvedPattern);
            Logger.debug(`Cache Pattern Invalidated: ${resolvedPattern}`);
          } catch (error) {
            Logger.error('Cache Invalidation Error', { error: error.message, pattern });
          }
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Admin Cache Invalidation Patterns
 */
export const adminCacheInvalidation = invalidateCache([
  // Invalidate admin profile cache
  (req) => `admin:profile:${req.admin?._id}`,
  // Invalidate admin list cache
  'admin:list:*',
  // Invalidate response cache for admin
  (req) => `response:admin:${req.admin?._id}:*`
]);

/**
 * Cache Statistics Middleware
 * Adds cache statistics to response headers
 */
export const cacheStats = () => {
  return (req, res, next) => {
    // Add cache stats to response headers
    res.on('finish', () => {
      const stats = MultiLayerCache.getStats();
      res.set('X-Cache-Stats', JSON.stringify(stats));
    });
    
    next();
  };
};

/**
 * Cache Health Check Middleware
 * Returns cache health information
 */
export const cacheHealth = async (req, res, next) => {
  try {
    const health = await MultiLayerCache.healthCheck();
    const stats = MultiLayerCache.getStats();
    
    res.json({
      status: 'success',
      data: {
        health,
        stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('Cache Health Check Error', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Cache health check failed'
    });
  }
};

export default cacheMiddleware;
export { cacheMiddleware };
