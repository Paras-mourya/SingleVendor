import Redis from 'ioredis';
import Logger from './logger.js';
import env from '../config/env.js';

class CacheService {
  constructor() {
    if (env.REDIS_URL) {
      this.redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      this.redis.on('error', (err) => Logger.error('Redis Error', { error: err.message }));
      this.redis.on('connect', () => Logger.info('Redis Connected'));
    }
  }

  async get(key) {
    if (!this.redis) return null;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key, value, expiry = 3600) {
    if (!this.redis) return;
    await this.redis.set(key, JSON.stringify(value), 'EX', expiry);
  }

  async del(key) {
    if (!this.redis) return;
    await this.redis.del(key);
  }

  async flush() {
    if (!this.redis) return;
    await this.redis.flushall();
  }
}

export default new CacheService();
