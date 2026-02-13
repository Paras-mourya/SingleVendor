import Redis from 'ioredis';
import env from './env.js';
import Logger from '../utils/logger.js';

const redisUrl = env.REDIS_URL || 'redis://127.0.0.1:6379';

// Base config for Redis operations (Enterprise standard)
const redisConfig = {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    Logger.debug(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: true, // Connect when needed or manually
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      Logger.warn('Redis READONLY error, reconnecting...');
      return true;
    }
    return false;
  },
};

// Add TLS configuration for Redis Cloud (rediss:// protocol)
if (redisUrl.startsWith('rediss://')) {
  redisConfig.tls = {
    rejectUnauthorized: false, // Often needed for cloud providers, set to true if you have custom certs
  };
  Logger.info('Redis Cloud TLS connection enabled');
}

const redisClient = new Redis(redisUrl, redisConfig);

redisClient.on('error', (err) => {
  Logger.error('REDIS_ERROR', { error: err.message, stack: err.stack });
});

redisClient.on('connect', () => {
  // Hide password in logs for security
  const sanitizedUrl = redisUrl.replace(/:[^:]*@/, ':***@');
  Logger.info('REDIS_CONNECTED', { url: sanitizedUrl });
});

redisClient.on('ready', async () => {
  Logger.info('REDIS_READY');

  /* 
  // ENTERPRISE DELETION PREVENTION: COMMENTED OUT FOR DEPLOYMENT SAFETY
  // The following block attempts to enforce 'noeviction' for BullMQ safety.
  // Commented out because programmatic CONFIG commands are restricted on some cloud providers.
  try {
    const policy = await redisClient.config('GET', 'maxmemory-policy');
    const currentPolicy = (Array.isArray(policy) && policy.length >= 2) ? policy[1] : 'unknown';

    if (currentPolicy !== 'noeviction') {
      Logger.warn(`IMPORTANT! Redis Eviction policy is "${currentPolicy}". Should be "noeviction".`);
      try {
        await redisClient.config('SET', 'maxmemory-policy', 'noeviction');
        Logger.info('Redis policy updated to "noeviction"');
      } catch (setError) {
        Logger.error('Permission Restricted: Please manually set maxmemory-policy to noeviction in console.');
      }
    }
  } catch (err) {
    Logger.debug('Redis CONFIG restricted.');
  }
  */
});

redisClient.on('reconnecting', (delay) => {
  Logger.warn('REDIS_RECONNECTING', { delay });
});

redisClient.on('close', () => {
  Logger.warn('REDIS_CONNECTION_CLOSED');
});

/**
 * Handle Redis Shutdown
 */
export const closeRedis = async () => {
  if (redisClient) {
    Logger.info('Closing Redis connection...');
    await redisClient.quit();
  }
};

export default redisClient;
