import express from 'express';
import { authorizeStaff } from '../middleware/employeeAuth.middleware.js';
import { SYSTEM_PERMISSIONS } from '../constants.js';
import AdminClearanceSaleController from '../controllers/adminClearanceSale.controller.js';
import lockRequest from '../middleware/idempotency.middleware.js';

const router = express.Router();

// Protected admin/staff routes
router.use(authorizeStaff(SYSTEM_PERMISSIONS.OFFERS_AND_DEALS));

router.get('/config', AdminClearanceSaleController.getConfig);

router.post('/config',
    lockRequest(),
    AdminClearanceSaleController.upsertConfig
);

router.patch('/toggle-status',
    lockRequest(),
    AdminClearanceSaleController.toggleStatus
);

router.post('/add-products',
    lockRequest(),
    AdminClearanceSaleController.addProducts
);

router.delete('/product/:productId',
    lockRequest(),
    AdminClearanceSaleController.removeProduct
);

router.patch('/product/:productId/discount',
    lockRequest(),
    AdminClearanceSaleController.updateProductDiscount
);

router.patch('/product/:productId/toggle-status',
    lockRequest(),
    AdminClearanceSaleController.toggleProductStatus
);

export default router;
