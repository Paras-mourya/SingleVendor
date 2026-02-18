import express from 'express';
import ProductController from '../controllers/product.controller.js';
import { authorizeStaff } from '../middleware/employeeAuth.middleware.js';
import { SYSTEM_PERMISSIONS } from '../constants.js';
import validate from '../middleware/validate.middleware.js';
import { productSchema, updateProductSchema, toggleStatusSchema, restockSchema } from '../validations/product.validation.js';
import lockRequest from '../middleware/idempotency.middleware.js';
import multer from 'multer';
import { cacheMiddleware, adminListCache } from '../middleware/cache.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Multi-Layer Cache middleware for product routes
const productCache = (ttl) => cacheMiddleware(ttl);
const productInvalidate = () => cacheMiddleware(0, () => 'invalidate');

/**
 * PUBLIC ROUTES
 */
router.get('/public/featured', productCache(600), ProductController.getFeaturedProducts);
router.get('/public/search', productCache(300), ProductController.searchProducts);
router.get('/public/similar/:id', productCache(900), ProductController.getSimilarProducts);
router.get('/public', productCache(900), ProductController.getPublicProducts);
router.get('/public/:id', productCache(1800), ProductController.getProductByIdPublic);

/**
 * ADMIN ROUTES (Staff Protected)
 */
router.use(authorizeStaff(SYSTEM_PERMISSIONS.PRODUCT_MANAGEMENT));

router.route('/')
  .post(lockRequest('create_product'), validate(productSchema), ProductController.createProduct)
  .get(adminListCache(900), ProductController.getAllProducts);

router.get('/admin/import-template', ProductController.getImportTemplate);
router.post('/admin/bulk-import', lockRequest('bulk_import_products'), upload.single('file'), ProductController.bulkImportProducts);
// Stock Management
router.get('/admin/low-stock', productCache(600), ProductController.getLowStockProducts);
router.route('/')
  .post(lockRequest('create_product'), validate(productSchema), ProductController.createProduct)
  .get(productCache(900), ProductController.getAllProducts);

router.route('/:id')
  .get(productCache(1800), ProductController.getProductById)
  .patch(lockRequest('update_product'), validate(updateProductSchema), ProductController.updateProduct)
  .delete(lockRequest('delete_product'), ProductController.deleteProduct);

router.patch('/:id/toggle-status',
  lockRequest('toggle_status'),
  validate(toggleStatusSchema),
  ProductController.toggleStatus
);

router.patch('/:id/restock',
  lockRequest('restock'),
  validate(restockSchema),
  ProductController.restockProduct
);

router.patch('/:id/status', lockRequest('toggle_product_status'), validate(toggleStatusSchema), ProductController.toggleStatus);
router.patch('/:id/featured', lockRequest('toggle_product_featured'), ProductController.toggleFeatured);

export default router;
