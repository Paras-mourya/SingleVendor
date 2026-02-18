import express from 'express';
import AdminController from '../controllers/admin.controller.js';
import { adminProtect } from '../middleware/adminAuth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import adminValidation from '../validations/admin.validation.js';
import { HTTP_STATUS } from '../constants.js';

import uploadMiddleware from '../middleware/upload.middleware.js';
import { cacheMiddleware, adminListCache } from '../middleware/cache.middleware.js';
import { lockRequest } from '../middleware/idempotency.middleware.js';

const router = express.Router();

import rateLimit from 'express-rate-limit';

// Multi-Layer Cache middleware for admin routes
const adminCache = (ttl) => cacheMiddleware(ttl);
const adminInvalidate = () => cacheMiddleware(0, () => 'invalidate');

// Strict Rate Limiter for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs (brute force protection)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    code: 'AUTH_RATE_LIMIT'
  }
});

// Rate limiter for password reset operations (more restrictive)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT'
  }
});

// Rate limiter for profile updates
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each admin to 5 profile updates per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many profile update attempts. Please try again later.',
    code: 'PROFILE_UPDATE_RATE_LIMIT'
  }
});

router.post('/login', authLimiter, validate(adminValidation.login), AdminController.login);
router.post('/refresh-token', validate(adminValidation.refreshToken), AdminController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, lockRequest('admin-forgot-password'), validate(adminValidation.forgotPassword), AdminController.forgotPassword);
router.post('/verify-otp', authLimiter, validate(adminValidation.verifyOtp), AdminController.verifyOtp);
router.post('/reset-password', passwordResetLimiter, lockRequest('admin-reset-password'), validate(adminValidation.resetPassword), AdminController.resetPassword);

// Protected routes
router.use(adminProtect);

router.post('/logout', AdminController.logout);
router.get('/me', adminCache(1800), AdminController.getMe);
router.patch('/profile', profileUpdateLimiter, adminInvalidate(), validate(adminValidation.updateProfile), AdminController.updateProfile);
router.patch('/photo', profileUpdateLimiter, adminInvalidate(), uploadMiddleware.single('photo'), AdminController.updatePhoto);
router.delete('/photo', adminInvalidate(), AdminController.deletePhoto);
router.patch('/update-password', profileUpdateLimiter, adminInvalidate(), validate(adminValidation.updatePassword), AdminController.updatePassword);

export default router;
