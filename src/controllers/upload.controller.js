import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';

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
