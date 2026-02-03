import express from 'express';
import ProductController from '../controllers/product.controller.js';
import { authorizeStaff } from '../middleware/employeeAuth.middleware.js';
import { SYSTEM_PERMISSIONS } from '../constants.js';
import validate from '../middleware/validate.middleware.js';
import { productSchema, updateProductSchema, toggleStatusSchema, restockSchema } from '../validations/product.validation.js';
import lockRequest from '../middleware/idempotency.middleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

/**
 * PUBLIC ROUTES
 */
router.get('/public/featured', ProductController.getFeaturedProducts);
router.get('/public/search', ProductController.searchProducts);
router.get('/public/similar/:id', ProductController.getSimilarProducts);
router.get('/public', ProductController.getPublicProducts);
router.get('/public/:id', ProductController.getProductByIdPublic);

/**
 * ADMIN ROUTES (Staff Protected)
 */
router.use(authorizeStaff(SYSTEM_PERMISSIONS.PRODUCT_MANAGEMENT));

router.route('/')
    .post(lockRequest('create_product'), validate(productSchema), ProductController.createProduct)
    .get(ProductController.getAllProducts);

// Bulk Management
router.get('/admin/import-template', ProductController.getImportTemplate);
router.post('/admin/bulk-import', lockRequest('bulk_import_products'), upload.single('file'), ProductController.bulkImportProducts);

// Stock Management
router.get('/admin/low-stock', ProductController.getLowStockProducts);
router.patch('/:id/restock', lockRequest('restock_product'), validate(restockSchema), ProductController.restockProduct);

router.route('/:id')
    .get(ProductController.getProductById)
    .patch(lockRequest('update_product'), validate(updateProductSchema), ProductController.updateProduct)
    .delete(lockRequest('delete_product'), ProductController.deleteProduct);

router.patch('/:id/status', lockRequest('toggle_product_status'), validate(toggleStatusSchema), ProductController.toggleStatus);
router.patch('/:id/featured', lockRequest('toggle_product_featured'), ProductController.toggleFeatured);

export default router;
