import mongoose from 'mongoose';
import Redis from 'ioredis';
import cloudinary from '../config/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Enterprise Health Check Controller
 * Provides detailed health status of the application and its dependencies.
 */
export const getHealth = async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
      },
      cloudinary: {
        status: cloudinary.config().cloud_name ? 'CONFIGURED' : 'UNCONFIGURED',
      },
      // If redis is configured
      cache: {
        status: 'SKIPPED',
      }
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    }
  };

  const statusCode = health.services.database.status === 'CONNECTED' 
    ? HTTP_STATUS.OK 
    : HTTP_STATUS.SERVICE_UNAVAILABLE;

  res.status(statusCode).json(new ApiResponse(statusCode, health, 'Health metrics retrieved'));
};

/**
 * Liveness probe for Kubernetes/Render
 */
export const liveness = (req, res) => {
  res.status(200).send('OK');
};
