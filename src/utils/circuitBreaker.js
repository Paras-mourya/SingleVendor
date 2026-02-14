import CircuitBreaker from 'opossum';
import Logger from './logger.js';

/**
 * Circuit Breaker Factory for External Services
 * Prevents cascade failures when external APIs fail
 */

const defaultOptions = {
  timeout: 10000,              // 10 seconds timeout
  errorThresholdPercentage: 50,  // Open circuit after 50% failures
  resetTimeout: 30000,        // Try again after 30 seconds
  volumeThreshold: 5,         // Minimum 5 requests before calculating
  rollingCountTimeout: 10000, // 10 second window for stats
  rollingCountBuckets: 10,    // 10 buckets in window
  name: 'default'
};

/**
 * Create a circuit breaker for any async function
 * @param {Function} asyncFunction - The function to protect
 * @param {Object} options - Circuit breaker options
 * @param {Function} fallback - Fallback function when circuit is open
 */
export const createCircuitBreaker = (asyncFunction, options = {}, fallback = null) => {
  const config = { ...defaultOptions, ...options };
  
  const breaker = new CircuitBreaker(asyncFunction, config);
  
  // Set fallback if provided
  if (fallback) {
    breaker.fallback(fallback);
  }
  
  // Event listeners for monitoring
  breaker.on('open', () => {
    Logger.error(`Circuit OPEN for ${config.name} - Too many failures`);
  });
  
  breaker.on('halfOpen', () => {
    Logger.warn(`Circuit HALF-OPEN for ${config.name} - Testing recovery`);
  });
  
  breaker.on('close', () => {
    Logger.info(`Circuit CLOSED for ${config.name} - Back to normal`);
  });
  
  breaker.on('fallback', (result) => {
    Logger.warn(`Circuit FALLBACK used for ${config.name}`, { result });
  });
  
  breaker.on('reject', () => {
    Logger.warn(`Circuit REJECTED request for ${config.name} - Circuit is open`);
  });
  
  breaker.on('timeout', () => {
    Logger.error(`Circuit TIMEOUT for ${config.name}`);
  });
  
  breaker.on('success', () => {
    // Optional: Log success for debugging
    // Logger.debug(`Circuit SUCCESS for ${config.name}`);
  });
  
  breaker.on('failure', (error) => {
    Logger.error(`Circuit FAILURE for ${config.name}`, { error: error.message });
  });
  
  return breaker;
};

/**
 * Pre-configured circuit breakers for common services
 */

// Cloudinary Upload Circuit Breaker
export const createCloudinaryUploadBreaker = (uploadFunction) => {
  return createCircuitBreaker(
    uploadFunction,
    {
      name: 'cloudinary-upload',
      timeout: 30000,  // 30 seconds for image uploads
      errorThresholdPercentage: 60,
      resetTimeout: 60000  // 1 minute
    },
    // Fallback: Return local storage path
    (file, folder) => {
      Logger.warn('Cloudinary upload failed, using local fallback');
      return {
        secure_url: `/uploads/fallback-${Date.now()}.jpg`,
        public_id: `fallback-${Date.now()}`,
        fallback: true
      };
    }
  );
};

// Cloudinary Delete Circuit Breaker
export const createCloudinaryDeleteBreaker = (deleteFunction) => {
  return createCircuitBreaker(
    deleteFunction,
    {
      name: 'cloudinary-delete',
      timeout: 10000,
      errorThresholdPercentage: 70,
      resetTimeout: 30000
    },
    // Fallback: Log and continue
    (publicId) => {
      Logger.warn(`Cloudinary delete failed for ${publicId}, will retry later`);
      return { deleted: false, queued: true };
    }
  );
};

// External API Call Circuit Breaker
export const createExternalAPIBreaker = (apiFunction, serviceName = 'external-api') => {
  return createCircuitBreaker(
    apiFunction,
    {
      name: serviceName,
      timeout: 5000,  // 5 seconds for APIs
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    },
    // Fallback: Return cached or default response
    (...args) => {
      Logger.warn(`${serviceName} API call failed, using fallback`);
      return { 
        success: false, 
        fallback: true, 
        message: 'Service temporarily unavailable' 
      };
    }
  );
};

/**
 * Health check for circuit breakers
 */
export const getCircuitHealth = (breakers) => {
  const health = {};
  
  for (const [name, breaker] of Object.entries(breakers)) {
    health[name] = {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: breaker.stats,
      fallbackExecutions: breaker.fallbackExecutions
    };
  }
  
  return health;
};

export default {
  createCircuitBreaker,
  createCloudinaryUploadBreaker,
  createCloudinaryDeleteBreaker,
  createExternalAPIBreaker,
  getCircuitHealth
};
