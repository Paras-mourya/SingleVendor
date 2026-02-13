import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import Logger from '../utils/logger.js';
import ProductService from '../services/product.service.js';

/**
 * Enterprise Background Worker Strategy
 * Offloads long-running tasks from the main thread.
 */
const productWorker = new Worker('product-tasks', async (job) => {
    const { type, data } = job.data;

    Logger.info(`Worker processing job ${job.id} of type ${type}`);

    try {
        switch (type) {
            case 'BULK_IMPORT':
                Logger.info(`Bulk import for job ${job.id} started`);
                // We pass the products array directly to the high-performance bulk write logic
                await ProductService.executeBulkImport(data.products, data.uploadedImages);
                break;

            case 'IMAGE_OPTIMIZATION':
                Logger.info(`Optimizing images for job ${job.id}`);
                break;

            default:
                Logger.warn(`Unknown job type: ${type}`);
        }
    } catch (error) {
        Logger.error(`Worker error on job ${job.id}`, { error: error.message });
        throw error; // Re-throw to allow BullMQ to handle retries
    }
}, {
    connection: redisClient,
    concurrency: 5, // Process 5 jobs in parallel
});

productWorker.on('completed', (job) => {
    Logger.info(`Worker job ${job.id} completed successfully`);
});

productWorker.on('failed', (job, err) => {
    Logger.error(`Worker job ${job.id} failed`, { error: err.message });
});

export default productWorker;
