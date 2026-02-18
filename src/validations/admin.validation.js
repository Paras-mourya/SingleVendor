import { z } from 'zod';
import { REGEX } from '../constants.js';

const login = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address').trim(),
    password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
    rememberMe: z.boolean().optional(),
  }),
});

const updateProfile = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters').trim().optional(),
    email: z.string().email('Invalid email address').trim().optional(),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  }),
});

const updatePassword = z.object({
  body: z.object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(8, 'Password must be at least 8 characters'),
    newPassword: z.string({ required_error: 'New password is required' }).min(8, 'New password must be at least 8 characters').regex(REGEX.PASSWORD, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    confirmPassword: z.string({ required_error: 'Password confirmation is required' }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

const forgotPassword = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address').trim(),
  }),
});

const verifyOtp = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address').trim(),
    otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
  }),
});

const resetPassword = z.object({
  body: z.object({
    resetToken: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token cannot be empty'),
    newPassword: z.string({ required_error: 'New password is required' }).min(8, 'New password must be at least 8 characters').regex(REGEX.PASSWORD, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    confirmPassword: z.string({ required_error: 'Password confirmation is required' }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

const refreshToken = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

const createAdmin = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters').trim(),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address').trim(),
    password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters').regex(REGEX.PASSWORD, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    role: z.enum(['superadmin', 'admin'], { required_error: 'Role is required' }),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  }),
});

const updateAdmin = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid admin ID format'),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters').trim().optional(),
    email: z.string().email('Invalid email address').trim().optional(),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
    role: z.enum(['superadmin', 'admin']).optional(),
    isActive: z.boolean().optional(),
  }),
});

const getAdmins = z.object({
  query: z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val) : 1)).pipe(z.number().min(1, 'Page must be at least 1')),
    limit: z.string().optional().transform(val => (val ? parseInt(val) : 10)).pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')),
    search: z.string().optional(),
    role: z.enum(['superadmin', 'admin']).optional(),
    isActive: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  }),
});

const deleteAdmin = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid admin ID format'),
  }),
});

export default {
  login,
  updateProfile,
  updatePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  refreshToken,
  createAdmin,
  updateAdmin,
  getAdmins,
  deleteAdmin,
};
