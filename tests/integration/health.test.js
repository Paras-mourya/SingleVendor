import request from 'supertest';
import app from '../../src/app.js';
import mongoose from 'mongoose';
import { closeRedis } from '../../src/config/redis.js';

describe('Integration: Health Endpoint', () => {
    // Gracefully handle database connections if they are shared
    afterAll(async () => {
        await mongoose.connection.close();
        await closeRedis();
    });

    it('should return 200 or 503 for /health/status', async () => {
        const res = await request(app).get('/health/status');
        // In test mode, DB is skipped, so it might return 503.
        expect([200, 503]).toContain(res.status);
        expect(res.body.success).toBe(res.status === 200);
    });

    it('should return 200 OK for /health/liveness', async () => {
        const res = await request(app).get('/health/liveness');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 200 OK for root endpoint', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ONLINE');
    });

    it('should return 404 for unknown routes', async () => {
        const res = await request(app).get('/api/v1/non-existent-route');
        expect(res.status).toBe(404);
    });
});
