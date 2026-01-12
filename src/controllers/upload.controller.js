import cloudinary from '../config/cloudinary.js';
import cloudinaryBreaker from '../utils/cloudinary.breaker.js';
import streamifier from 'streamifier';
import { ApiResponse } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Utility: Upload Buffer to Cloudinary using Streams
 * Enterprise Additions: Automatic optimization and format conversion
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

    // Track the stream start in the breaker context if needed
    // For simplicity with streamifier, we wrap the result promise
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Utility: Delete from Cloudinary
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    // We log but don't necessarily throw to prevent blocking the main flow
    Logger.error('Cloudinary Deletion Failed', { publicId, error: error.message });
    return null;
  }
};

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private (Usually)
export const uploadSingle = async (req, res) => {
  if (!req.file) {
    throw new AppError('File is required', HTTP_STATUS.BAD_REQUEST, 'UPLOAD_ERROR');
  }

  const result = await uploadToCloudinary(req.file);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
    }, 'File uploaded successfully')
  );
};

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private
export const uploadMultiple = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', HTTP_STATUS.BAD_REQUEST, 'UPLOAD_ERROR');
  }

  const uploaded = await Promise.all(
    req.files.map(file => uploadToCloudinary(file))
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, {
      count: uploaded.length,
      files: uploaded.map(f => ({
        url: f.secure_url,
        publicId: f.public_id,
        format: f.format,
        resourceType: f.resource_type,
        bytes: f.bytes,
      })),
    }, 'Files uploaded successfully')
  );
};

// @desc    Upload specific fields (e.g., avatar and gallery)
// @route   POST /api/upload/fields
// @access  Private
export const uploadFields = async (req, res) => {
  const avatarFile = req.files?.avatar?.[0];
  const galleryFiles = req.files?.gallery || [];

  const response = {
    avatar: avatarFile ? await uploadToCloudinary(avatarFile, 'avatars') : null,
    gallery: galleryFiles.length > 0 
      ? await Promise.all(galleryFiles.map(f => uploadToCloudinary(f, 'gallery'))) 
      : [],
  };

  const formatted = {
    avatar: response.avatar ? {
      url: response.avatar.secure_url,
      publicId: response.avatar.public_id,
    } : null,
    gallery: response.gallery.map(f => ({
      url: f.secure_url,
      publicId: f.public_id,
    })),
  };

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, formatted, 'Field files uploaded successfully')
  );
};
