import NodeCache from 'node-cache';
import redisClient from '../config/redis.js';
import Logger from './logger.js';

class MultiLayerCache {
  constructor() {
    // L1: In-Memory Cache (5 minutes default TTL)
    this.l1Cache = new NodeCache({ 
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false // Performance optimization
    });
    
    // Cache statistics
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      sets: 0
    };
  }

  /**
   * Get value from cache (L1 -> L2 -> DB)
   * Cache-Aside Pattern Implementation
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data from DB if cache miss
   * @param {number} ttl - Time to live in seconds (default 1 hour)
   * @returns {Promise<any>}
   */
  async get(key, fetchFunction, ttl = 3600) {
    try {
      // L1: Check In-Memory Cache first (fastest)
      let data = this.l1Cache.get(key);
      if (data !== undefined) {
        this.stats.l1Hits++;
        Logger.debug(`L1 Cache Hit: ${key}`);
        return data;
      }
      this.stats.l1Misses++;

      // L2: Check Redis Cache (distributed)
      const redisData = await redisClient.get(key);
      if (redisData) {
        data = JSON.parse(redisData);
        this.stats.l2Hits++;
        
        // Populate L1 cache from L2 for faster future access
        this.l1Cache.set(key, data, Math.min(ttl, 300)); // L1 max 5 minutes
        Logger.debug(`L2 Cache Hit: ${key}`);
        return data;
      }
      this.stats.l2Misses++;

      // Cache Miss: Fetch from DB
      Logger.debug(`Cache Miss: ${key} - Fetching from DB`);
      if (!fetchFunction) {
        return null;
      }

      data = await fetchFunction();
      
      // Set cache in both layers
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      Logger.error(`Multi-Layer Cache Get Error: ${key}`, { error: error.message });
      // Fallback: Try to fetch from DB directly
      if (fetchFunction) {
        return await fetchFunction();
      }
      return null;
    }
  }

  /**
   * Set value in both cache layers
   * Write-Through Pattern Implementation
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default 1 hour)
   */
  async set(key, value, ttl = 3600) {
    try {
      this.stats.sets++;
      
      // L1: Set in-memory cache (max 5 minutes)
      const l1TTL = Math.min(ttl, 300);
      this.l1Cache.set(key, value, l1TTL);
      
      // L2: Set Redis cache
      const stringValue = JSON.stringify(value);
      const cleanTTL = Math.floor(Number(ttl)) || 3600;
      await redisClient.set(key, stringValue, 'EX', cleanTTL);
      
      Logger.debug(`Cache Set: ${key} (L1: ${l1TTL}s, L2: ${cleanTTL}s)`);
    } catch (error) {
      Logger.error(`Multi-Layer Cache Set Error: ${key}`, { error: error.message });
    }
  }

  /**
   * Delete from both cache layers
   * @param {string} key - Cache key to delete
   */
  async del(key) {
    try {
      // L1: Delete from in-memory cache
      this.l1Cache.del(key);
      
      // L2: Delete from Redis
      await redisClient.del(key);
      
      Logger.info(`Cache Invalidated: ${key} (both layers)`);
    } catch (error) {
      Logger.error(`Multi-Layer Cache Delete Error: ${key}`, { error: error.message });
    }
  }

  /**
   * Delete keys by pattern from both layers
   * @param {string} pattern - Pattern to match keys
   */
  async delByPattern(pattern) {
    try {
      // L1: Get and delete matching keys from in-memory cache
      const l1Keys = this.l1Cache.keys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingL1Keys = l1Keys.filter(key => regex.test(key));
      
      matchingL1Keys.forEach(key => this.l1Cache.del(key));
      
      // L2: Delete matching keys from Redis
      const redisKeys = await redisClient.keys(pattern);
      if (redisKeys.length > 0) {
        await redisClient.del(...redisKeys);
      }
      
      Logger.info(`Cache Pattern Invalidated: ${pattern} (L1: ${matchingL1Keys.length}, L2: ${redisKeys.length} keys)`);
    } catch (error) {
      Logger.error(`Multi-Layer Cache Pattern Delete Error: ${pattern}`, { error: error.message });
    }
  }

  /**
   * Clear all cache from both layers
   */
  async clear() {
    try {
      // L1: Clear in-memory cache
      this.l1Cache.flushAll();
      
      // L2: Clear Redis cache
      await redisClient.flushdb();
      
      Logger.info('All Cache Cleared (both layers)');
    } catch (error) {
      Logger.error('Multi-Layer Cache Clear Error', { error: error.message });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const l1Stats = this.l1Cache.getStats();
    const totalRequests = this.stats.l1Hits + this.stats.l1Misses;
    
    return {
      ...this.stats,
      l1HitRate: totalRequests > 0 ? (this.stats.l1Hits / totalRequests * 100).toFixed(2) + '%' : '0%',
      l2HitRate: totalRequests > 0 ? (this.stats.l2Hits / totalRequests * 100).toFixed(2) + '%' : '0%',
      l1MemoryUsage: l1Stats.ksize + 'KB',
      l1Keys: l1Stats.keys
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      sets: 0
    };
  }

  /**
   * Health check for both cache layers
   */
  async healthCheck() {
    const health = {
      l1: { status: 'healthy', latency: 0 },
      l2: { status: 'healthy', latency: 0 },
      overall: 'healthy'
    };

    try {
      // Test L1 (in-memory)
      const start1 = Date.now();
      this.l1Cache.set('health-check', 'ok', 10);
      const l1Result = this.l1Cache.get('health-check');
      this.l1Cache.del('health-check');
      health.l1.latency = Date.now() - start1;
      if (l1Result !== 'ok') {
        health.l1.status = 'error';
        health.overall = 'degraded';
      }
    } catch (error) {
      health.l1.status = 'error';
      health.overall = 'degraded';
    }

    try {
      // Test L2 (Redis)
      const start2 = Date.now();
      await redisClient.set('health-check', 'ok', 'EX', 10);
      const l2Result = await redisClient.get('health-check');
      await redisClient.del('health-check');
      health.l2.latency = Date.now() - start2;
      if (l2Result !== 'ok') {
        health.l2.status = 'error';
        health.overall = 'degraded';
      }
    } catch (error) {
      health.l2.status = 'error';
      health.overall = 'degraded';
    }

    return health;
  }
}

export default new MultiLayerCache();
