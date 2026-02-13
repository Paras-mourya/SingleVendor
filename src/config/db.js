import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Test environment detected, skipping real MongoDB connection');
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 100, // Increase pool size for high concurrency
      minPoolSize: 10,  // Maintain a minimum number of connections
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // Stop trying to connect after 5 seconds
      heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
      autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-indexing in production
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
