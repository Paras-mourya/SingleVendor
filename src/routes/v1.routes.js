import express from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import uploadRoutes from './upload.routes.js';
import adminRoutes from './admin.routes.js';
import contentRoutes from './content.routes.js';
import faqRoutes from './faq.routes.js';

const router = express.Router();

/**
 * V1 Route Entry Point
 * Centralizes all version 1 endpoints.
 */
router.use('/auth', authRoutes);
router.use('/admin/auth', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/content', contentRoutes);
router.use('/faqs', faqRoutes);

// Health check can also be versioned if needed, but usually kept root
router.use('/health', healthRoutes);

export default router;
