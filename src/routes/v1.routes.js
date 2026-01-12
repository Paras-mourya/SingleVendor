import express from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import uploadRoutes from './upload.routes.js';

const router = express.Router();

/**
 * V1 Route Entry Point
 * Centralizes all version 1 endpoints.
 */
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);

// Health check can also be versioned if needed, but usually kept root
router.use('/health', healthRoutes);

export default router;
