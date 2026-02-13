import { Queue } from 'bullmq';
import redisClient from './redis.js';
import Logger from '../utils/logger.js';

// Connection options for BullMQ
const connection = redisClient;

/**
 * Enterprise Queue Strategy (Producer side)
 */
export const productQueue = new Queue('product-tasks', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

Logger.info('BullMQ: Product Tasks Queue Initialized');
