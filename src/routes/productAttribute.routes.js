import express from 'express';
import ProductAttributeController from '../controllers/productAttribute.controller.js';
import { authorizeStaff } from '../middleware/employeeAuth.middleware.js';
import { SYSTEM_PERMISSIONS } from '../constants.js';
import validate from '../middleware/validate.middleware.js';
import { z } from 'zod';
import cacheMiddleware from '../middleware/cache.middleware.js';
import lockRequest from '../middleware/idempotency.middleware.js';

const router = express.Router();

// Validation Schemas
const createAttributeSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Attribute name is required'),
        values: z.array(z.string()).optional(),
    }),
});

const updateAttributeSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        values: z.array(z.string()).optional(),
    }),
});

// Public / Vendor Route
router.get('/public', cacheMiddleware(3600), ProductAttributeController.getPublicAttributes);

// Protect all routes with RBAC (Assuming Product Management permission)
router.use(authorizeStaff(SYSTEM_PERMISSIONS.PRODUCT_MANAGEMENT));

router.route('/')
    .post(lockRequest('create_attribute'), validate(createAttributeSchema), ProductAttributeController.createAttribute)
    .get(cacheMiddleware(3600), ProductAttributeController.getAllAttributes); // Cached

router.route('/:id')
    .get(ProductAttributeController.getAttributeById)
    .patch(lockRequest('update_attribute'), validate(updateAttributeSchema), ProductAttributeController.updateAttribute)
    .delete(lockRequest('delete_attribute'), ProductAttributeController.deleteAttribute);

export default router;
