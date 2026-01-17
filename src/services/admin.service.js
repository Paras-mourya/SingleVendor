import AdminRepository from '../repositories/admin.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import AuditLogger from '../utils/audit.js';
import env from '../config/env.js';
import Logger from '../utils/logger.js';

import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

class AdminService {
  /**
   * Admin Login logic with "Remember Me"
   */
  async login(email, password, rememberMe = false) {
    const admin = await AdminRepository.findByEmail(email, true);
    
    if (!admin) {
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, 'INVALID_ADMIN_AUTH');
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      AuditLogger.security('ADMIN_LOGIN_FAILED', { email });
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, 'INVALID_ADMIN_AUTH');
    }

    // Determine refresh token expiration
    // 30 days if rememberMe, 1 day otherwise
    const refreshTokenExpire = rememberMe ? '30d' : '1d';

    const accessToken = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id, refreshTokenExpire);

    AuditLogger.log('ADMIN_LOGIN_SUCCESS', 'ADMIN', { adminId: admin._id, rememberMe });
    
    return {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phoneNumber: admin.phoneNumber,
        photo: admin.photo,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Update Admin Profile
   */
  async updateProfile(adminId, updateData) {
    const { email } = updateData;

    // If email is being updated, check for duplicates
    if (email) {
      const existingAdmin = await AdminRepository.findByEmail(email);
      if (existingAdmin && existingAdmin._id.toString() !== adminId) {
        throw new AppError('Email already in use by another admin', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
      }
    }

    const updatedAdmin = await AdminRepository.updateById(adminId, updateData);
    if (!updatedAdmin) {
      throw new AppError('Admin not found', HTTP_STATUS.NOT_FOUND, 'ADMIN_NOT_FOUND');
    }

    AuditLogger.log('ADMIN_PROFILE_UPDATED', 'ADMIN', { adminId, updatedFields: Object.keys(updateData) });

    return {
      id: updatedAdmin._id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      phoneNumber: updatedAdmin.phoneNumber,
      photo: updatedAdmin.photo,
    };
  }

  /**
   * Update Admin Photo
   */
  async updatePhoto(adminId, file) {
    const admin = await AdminRepository.findById(adminId);
    if (!admin) {
      throw new AppError('Admin not found', HTTP_STATUS.NOT_FOUND, 'ADMIN_NOT_FOUND');
    }

    // Delete old photo if exists
    if (admin.photo?.publicId) {
      await deleteFromCloudinary(admin.photo.publicId);
    }

    // Upload new photo
    const result = await uploadToCloudinary(file, 'admins/profiles');
    
    const photoData = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    const updatedAdmin = await AdminRepository.updateById(adminId, { photo: photoData });
    AuditLogger.log('ADMIN_PHOTO_UPDATED', 'ADMIN', { adminId });

    return updatedAdmin.photo;
  }

  /**
   * Delete Admin Photo
   */
  async deletePhoto(adminId) {
    const admin = await AdminRepository.findById(adminId);
    if (!admin) {
      throw new AppError('Admin not found', HTTP_STATUS.NOT_FOUND, 'ADMIN_NOT_FOUND');
    }

    if (admin.photo?.publicId) {
      await deleteFromCloudinary(admin.photo.publicId);
    }

    await AdminRepository.updateById(adminId, { 
      photo: { url: null, publicId: null } 
    });

    AuditLogger.log('ADMIN_PHOTO_DELETED', 'ADMIN', { adminId });
    return true;
  }

  /**
   * Update Admin Password
   */
  async updatePassword(adminId, newPassword) {
    const admin = await AdminRepository.findById(adminId);
    if (!admin) {
      throw new AppError('Admin not found', HTTP_STATUS.NOT_FOUND, 'ADMIN_NOT_FOUND');
    }

    admin.password = newPassword;
    await admin.save(); // Model pre-save hook will hash it

    AuditLogger.log('ADMIN_PASSWORD_CHANGED', 'ADMIN', { adminId });
    return true;
  }

  /**
   * Bootstraps the initial admin user from environment variables if no admin exists.
   */
  async bootstrapAdmin() {
    try {
      const count = await AdminRepository.count();
      if (count === 0) {
        Logger.info('🚀 No admin found, bootstrapping initial admin...');
        await AdminRepository.create({
          name: 'System Admin',
          email: env.ADMIN_EMAIL,
          password: env.ADMIN_PASSWORD, // This will be hashed by the model pre-save hook
        });
        Logger.info('✅ Initial admin bootstrapped successfully.');
      }
    } catch (error) {
      Logger.error('❌ Failed to bootstrap admin:', error);
    }
  }
}

export default new AdminService();
