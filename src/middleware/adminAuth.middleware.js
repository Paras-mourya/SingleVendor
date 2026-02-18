import jwt from 'jsonwebtoken';
import AdminRepository from '../repositories/admin.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import env from '../config/env.js';

const ADMIN_AUTH_CACHE_PREFIX = 'auth:admin:';

/**
 * Middleware to protect admin routes.
 * Ensures the requester is authenticated as an Admin.
 */
export const adminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.adminAccessToken) {
    token = req.cookies.adminAccessToken;
  }

  if (!token) {
    throw new AppError('Admin authentication required', HTTP_STATUS.UNAUTHORIZED, 'ADMIN_UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Cache admin authentication data for faster admin panel access
    const cacheKey = `${ADMIN_AUTH_CACHE_PREFIX}${decoded.id}:${decoded.version}`;
    
    const admin = await MultiLayerCache.get(cacheKey, async () => {
      return await AdminRepository.findById(decoded.id);
    }, 1800); // 30 minutes cache for admin auth data
    
    if (!admin) {
      throw new AppError('Admin not found or unauthorized', HTTP_STATUS.UNAUTHORIZED, 'ADMIN_NOT_FOUND');
    }

    // Token versioning check for instant session revocation
    if (decoded.version !== admin.tokenVersion) {
      // Invalidate cache on version mismatch
      await MultiLayerCache.del(cacheKey);
      throw new AppError('Admin session expired. Please login again.', HTTP_STATUS.UNAUTHORIZED, 'ADMIN_SESSION_REVOKED');
    }

    // Attach admin info to request
    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Admin session expired', HTTP_STATUS.UNAUTHORIZED, 'ADMIN_TOKEN_EXPIRED');
    }
    throw new AppError('Invalid admin token', HTTP_STATUS.UNAUTHORIZED, 'ADMIN_INVALID_TOKEN');
  }
};
