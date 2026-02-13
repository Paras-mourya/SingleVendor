import ProductService from '../services/product.service.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants.js';
import catchAsync from '../utils/catchAsync.js';
import AuditLogger from '../utils/audit.js';

class ProductController {
  /**
     * @desc    Create New Product
     * @access  Private (Admin/Staff)
     */
  createProduct = catchAsync(async (req, res) => {
    const product = await ProductService.createProduct(req.body);

    AuditLogger.log('PRODUCT_CREATE', 'ADMIN', {
      productId: product._id,
      name: product.name,
      sku: product.sku
    }, req);

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, product, SUCCESS_MESSAGES.CREATED)
    );
  });

  /**
     * @desc    Get All Products (Admin View)
     * @access  Private (Admin/Staff)
     */
  getAllProducts = catchAsync(async (req, res) => {
    const result = await ProductService.getAllProducts(req.query);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, {
        products: result.products,
        total: result.total,
        nextCursor: result.nextCursor,
        limit: result.limit
      }, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Get Single Product (Admin/Staff)
     * @access  Private
     */
  getProductById = catchAsync(async (req, res) => {
    const product = await ProductService.getProductById(req.params.id);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, product, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Update Product
     * @access  Private
     */
  updateProduct = catchAsync(async (req, res) => {
    const product = await ProductService.updateProduct(req.params.id, req.body);

    AuditLogger.log('PRODUCT_UPDATE', 'ADMIN', {
      productId: req.params.id,
      changes: Object.keys(req.body)
    }, req);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, product, SUCCESS_MESSAGES.UPDATED)
    );
  });

  /**
     * @desc    Delete Product
     * @access  Private
     */
  deleteProduct = catchAsync(async (req, res) => {
    await ProductService.deleteProduct(req.params.id);

    AuditLogger.log('PRODUCT_DELETE', 'ADMIN', {
      productId: req.params.id
    }, req);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.DELETED)
    );
  });

  /**
     * @desc    Toggle Status / Active
     * @access  Private
     */
  toggleStatus = catchAsync(async (req, res) => {
    const product = await ProductService.toggleStatus(req.params.id, req.body);

    AuditLogger.log('PRODUCT_STATUS_TOGGLE', 'ADMIN', {
      productId: req.params.id,
      status: req.body.status,
      isActive: req.body.isActive
    }, req);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, product, 'Product status updated successfully.')
    );
  });

  /**
     * @desc    Toggle Featured Status
     * @access  Private
     */
  toggleFeatured = catchAsync(async (req, res) => {
    const product = await ProductService.toggleFeatured(req.params.id);

    AuditLogger.log('PRODUCT_FEATURED_TOGGLE', 'ADMIN', {
      productId: req.params.id,
      isFeatured: product.isFeatured
    }, req);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, product, `Product marked as ${product.isFeatured ? 'featured' : 'not featured'}.`)
    );
  });

  /**
     * @desc    Get Featured Products (Homepage Section)
     * @access  Public
     */
  getFeaturedProducts = catchAsync(async (req, res) => {
    const limit = req.query.limit || 8;
    const products = await ProductService.getFeaturedProducts(limit);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, products, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Download Bulk Import Template
     * @access  Private (Admin)
     */
  getImportTemplate = catchAsync(async (req, res) => {
    const buffer = await ProductService.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=product_import_template.xlsx');
    res.status(HTTP_STATUS.OK).send(buffer);
  });

  /**
     * @desc    Bulk Import Products
     * @access  Private (Admin)
     */
  bulkImportProducts = catchAsync(async (req, res) => {
    if (!req.file) {
      throw new AppError('Excel file is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await ProductService.bulkImportProducts(req.file.buffer);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        new ApiResponse(HTTP_STATUS.BAD_REQUEST, result, result.message)
      );
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, result, 'Bulk import successful')
    );
  });

  /**
     * @desc    Get Low Stock Products
     * @access  Private (Admin)
     */
  getLowStockProducts = catchAsync(async (req, res) => {
    const result = await ProductService.getLowStockProducts(req.query);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, {
        products: result.products,
        total: result.total,
        nextCursor: result.nextCursor,
        limit: result.limit
      }, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Restock Product
     * @access  Private (Admin)
     */
  restockProduct = catchAsync(async (req, res) => {
    const product = await ProductService.restockProduct(req.params.id, req.body.quantity);

    AuditLogger.log('PRODUCT_RESTOCK', 'ADMIN', {
      productId: req.params.id,
      addedQuantity: req.body.quantity,
      newQuantity: product.quantity
    }, req);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, product, 'Product restocked successfully')
    );
  });

  /**
     * @desc    High-speed Search Bar API
     * @access  Public
     */
  searchProducts = catchAsync(async (req, res) => {
    const { q, cursor, limit } = req.query;
    const result = await ProductService.searchProducts(q, cursor, limit);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, {
        products: result.products,
        total: result.total,
        nextCursor: result.nextCursor,
        limit: result.limit
      }, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Get Similar Products Recommendation
     * @access  Public
     */
  getSimilarProducts = catchAsync(async (req, res) => {
    const products = await ProductService.getSimilarProducts(req.params.id, req.query.limit);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, products, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Get Products for Public (Homepage/Catalog)
     * @access  Public
     */
  getPublicProducts = catchAsync(async (req, res) => {
    const result = await ProductService.getPublicProducts(req.query);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, {
        products: result.products,
        total: result.total,
        nextCursor: result.nextCursor,
        limit: result.limit
      }, SUCCESS_MESSAGES.FETCHED)
    );
  });

  /**
     * @desc    Get Public Product Details by ID
     * @access  Public
     */
  getProductByIdPublic = catchAsync(async (req, res) => {
    const product = await ProductService.getPublicProductById(req.params.id);
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, product, SUCCESS_MESSAGES.FETCHED)
    );
  });
}

export default new ProductController();
