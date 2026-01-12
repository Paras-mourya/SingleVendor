import CircuitBreaker from 'opossum';
import cloudinary from '../config/cloudinary.js';
import Logger from './logger.js';

/**
 * Enterprise Circuit Breaker for Cloudinary
 * Prevents the application from hanging if Cloudinary is slow or down.
 */
const breakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
};

const uploadStreamAction = (options, buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    // This is handled by streamifier in the controller, but we wrap the callback logic here
  });
};

const cloudinaryBreaker = new CircuitBreaker(uploadStreamAction, breakerOptions);

cloudinaryBreaker.on('open', () => Logger.warn('⚠️ Cloudinary Circuit Breaker OPENED'));
cloudinaryBreaker.on('halfOpen', () => Logger.info('🔄 Cloudinary Circuit Breaker HALF-OPEN'));
cloudinaryBreaker.on('close', () => Logger.info('✅ Cloudinary Circuit Breaker CLOSED'));
cloudinaryBreaker.on('fallback', (data) => Logger.error('❌ Cloudinary Circuit Breaker FALLBACK', data));

export default cloudinaryBreaker;
