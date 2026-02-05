import express from 'express';
import AdminCustomerController from '../controllers/adminCustomer.controller.js';
import { authorizeStaff } from '../middleware/employeeAuth.middleware.js';
import { SYSTEM_PERMISSIONS } from '../constants.js';
import validate from '../middleware/validate.middleware.js';
import CustomerValidation from '../validations/customer.validation.js';
import lockRequest from '../middleware/idempotency.middleware.js';
import cacheMiddleware from '../middleware/cache.middleware.js';

const router = express.Router();

/**
 * All routes here require Staff/Admin authentication with USER_MANAGEMENT permission
 */
router.use(authorizeStaff(SYSTEM_PERMISSIONS.USER_MANAGEMENT));

/**
 * @desc    Get all customers
 * @route   GET /api/v1/admin/customers
 * @access  Private (Admin)
 */
router.get(
    '/',
    validate(CustomerValidation.adminGetCustomers),
    cacheMiddleware(300), // 5 min cache for admin list
    AdminCustomerController.getAllCustomers
);

/**
 * @desc    Export customers
 * @route   GET /api/v1/admin/customers/export
 * @access  Private (Admin)
 */
router.get(
    '/export',
    AdminCustomerController.exportCustomers
);

/**
 * @desc    Get single customer
 * @route   GET /api/v1/admin/customers/:id
 * @access  Private (Admin)
 */
router.get(
    '/:id',
    AdminCustomerController.getCustomerById
);

/**
 * @desc    Update customer status (Block/Unblock)
 * @route   PATCH /api/v1/admin/customers/:id/status
 * @access  Private (Admin)
 */
router.patch(
    '/:id/status',
    lockRequest(5),
    validate(CustomerValidation.adminUpdateStatus),
    AdminCustomerController.updateCustomerStatus
);

export default router;
