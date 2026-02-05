import { z } from 'zod';
import { REGEX } from '../constants.js';

const signup = z.object({
    body: z.object({
        name: z.string({ required_error: 'Name is required' }).min(2).max(50).trim(),
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
        password: z.string({ required_error: 'Password is required' }).min(8).regex(REGEX.PASSWORD, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
        confirmPassword: z.string().optional(),
        agreeTerms: z.boolean().optional(),
    }).refine((data) => {
        if (data.confirmPassword && data.password !== data.confirmPassword) return false;
        return true;
    }, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});

const verifyOtp = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
        code: z.string({ required_error: 'OTP code is required' }).length(6).regex(/^\d+$/, 'OTP must be 6 digits'),
    }),
});

const resendOtp = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
    }),
});

const login = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
        password: z.string({ required_error: 'Password is required' }).min(8),
    }),
});

const forgotPassword = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
    }),
});

const verifyResetOtp = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
        code: z.string({ required_error: 'OTP code is required' }).length(6).regex(/^\d+$/, 'OTP must be 6 digits'),
    }),
});

const resetPassword = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email('Invalid email address').lowercase().trim(),
        code: z.string({ required_error: 'OTP code is required' }).length(6).regex(/^\d+$/, 'OTP must be 6 digits'),
        newPassword: z.string({ required_error: 'New password is required' }).min(8).regex(REGEX.PASSWORD, 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
        confirmPassword: z.string().optional(),
    }).refine((data) => {
        if (data.confirmPassword && data.newPassword !== data.confirmPassword) return false;
        return true;
    }, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});

const updateProfile = z.object({
    body: z.object({
        name: z.string().min(2).max(50).trim().optional(),
        phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
    }),
});

const adminUpdateStatus = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
    }),
    body: z.object({
        isActive: z.boolean({ required_error: 'isActive status is required' }),
    }),
});

const adminGetCustomers = z.object({
    query: z.object({
        page: z.string().optional().transform(val => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform(val => (val ? parseInt(val) : 10)),
        search: z.string().optional(),
        status: z.enum(['active', 'blocked', '']).optional(),
    }),
});

export default {
    signup,
    verifyOtp,
    resendOtp,
    login,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    updateProfile,
    adminUpdateStatus,
    adminGetCustomers,
};
