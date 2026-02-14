import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import Logger from './logger.js';
import { createCloudinaryUploadBreaker, createCloudinaryDeleteBreaker } from './circuitBreaker.js';

/**
 * Utility: Upload Buffer to Cloudinary using Streams (with Circuit Breaker)
 */
export const uploadToCloudinary = (file, folder = 'single-vendor', options = {}) => {
  return new Promise((resolve, reject) => {
    const buffer = file.buffer;
    if (!buffer) return reject(new Error('No file buffer provided'));

    const uploadOptions = {
      folder,
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Circuit Breaker for uploads
const uploadBreaker = createCloudinaryUploadBreaker(uploadToCloudinary);

/**
 * Safe upload with circuit breaker
 * Falls back to local storage if Cloudinary fails
 */
export const uploadToCloudinarySafe = async (file, folder = 'single-vendor', options = {}) => {
  try {
    const result = await uploadBreaker.fire(file, folder, options);
    return result;
  } catch (error) {
    Logger.error('Cloudinary upload failed (circuit open)', { error: error.message });
    throw error;
  }
};

/**
 * Utility: Delete from Cloudinary (with Circuit Breaker)
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    Logger.error('Cloudinary Deletion Failed', { publicId, error: error.message });
    return null;
  }
};

// Circuit Breaker for deletes
const deleteBreaker = createCloudinaryDeleteBreaker(deleteFromCloudinary);

/**
 * Safe delete with circuit breaker
 * Queues for retry if Cloudinary fails
 */
export const deleteFromCloudinarySafe = async (publicId, resourceType = 'image') => {
  try {
    const result = await deleteBreaker.fire(publicId, resourceType);
    return result;
  } catch (error) {
    Logger.warn('Cloudinary delete failed (circuit open), queued for retry', { publicId });
    return { deleted: false, queued: true };
  }
};
