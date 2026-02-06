import app from './src/app.js';
import env from './src/config/env.js';
import Logger from './src/utils/logger.js';
import connectDB from './src/config/db.js';
import redisClient, { closeRedis } from './src/config/redis.js';
import AdminService from './src/services/admin.service.js';
import systemConfig from './src/utils/systemConfig.js';

// Connect to database
console.log('Connecting to database...');
await connectDB();
console.log('Connected to database.');

// Connect to Redis (Enterprise: verify connectivity on startup)
try {
  if (process.env.NODE_ENV !== 'test') {
    await redisClient.connect();
  } else {
    Logger.info('Test environment detected, skipping real Redis connection');
  }
} catch (err) {
  Logger.error('Redis connection failed on startup', { error: err.message });
}

// Bootstrap Admin & Templates (Skip in test mode for faster/isolated testing)
if (process.env.NODE_ENV !== 'test') {
  await AdminService.bootstrapAdmin();
  const CustomerEmailTemplateService = (await import('./src/services/customerEmailTemplate.service.js')).default;
  const PaymentGatewayService = (await import('./src/services/paymentGateway.service.js')).default;
  await CustomerEmailTemplateService.bootstrapTemplates();
  await PaymentGatewayService.bootstrapGateways();

  // System Mode Validation on Startup
  try {
    const isLive = await systemConfig.isLiveMode();
    if (isLive && env.NODE_ENV !== 'production') {
      Logger.error(`
        CRITICAL: System is set to LIVE MODE but running in ${env.NODE_ENV.toUpperCase()} environment.
        All API requests will be blocked by security middleware until this is resolved.
      `);
    }
  } catch (err) {
    Logger.error('Failed to validate system mode on startup', { error: err.message });
  }
} else {
  Logger.info('Test environment detected, skipping service bootstrapping');
}

const PORT = env.PORT || 5000;

let server;
server = app.listen(PORT, () => {
  Logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

/**
 * GRACEFUL SHUTDOWN
 */
const gracefulShutdown = (signal) => {
  Logger.warn(`RECEIVED ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      Logger.info('HTTP server closed.');
      try {
        const mongoose = (await import('mongoose')).default;
        await mongoose.connection.close();
        Logger.info('Database connection closed.');

        await closeRedis();
        Logger.info('Redis connection closed.');

        process.exit(0);
      } catch (err) {
        Logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    Logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  Logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
});

process.on('uncaughtException', (err) => {
  Logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

export default app;
