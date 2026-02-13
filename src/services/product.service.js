import ProductRepository from '../repositories/product.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import slugify from 'slugify';
import Cache from '../utils/cache.js';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import ProductCategoryRepository from '../repositories/productCategory.repository.js';
import ProductSubCategoryRepository from '../repositories/productSubCategory.repository.js';
import { parseProductExcel } from '../utils/excelParser.util.js';
import { uploadImageFromUrl, uploadMultipleImagesFromUrls, deleteMultipleImages } from '../utils/imageUpload.util.js';
import Logger from '../utils/logger.js';
import { generateProductImportTemplate } from '../utils/excelTemplate.util.js';
import FlashDealService from './flashDeal.service.js';
import { productQueue } from '../config/queue.js';

class ProductService {
  async createProduct(data) {
    // 1. Generate unique slug
    let slug = slugify(data.name, { lower: true, strict: true });
    const existingSlug = await ProductRepository.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }
    data.slug = slug;

    // 2. Initial status check (User wants admin to toggle active later)
    if (!data.status) data.status = 'inactive';
    if (data.isActive === undefined) data.isActive = false;

    const product = await ProductRepository.create(data);

    // Invalidate product caches
    await this.invalidateCache();

    return product;
  }

  async getAllProducts(query) {
    const {
      limit = 10,
      cursor = null,
      category,
      status,
      search,
      minPrice,
      maxPrice,
      stockStatus,
      isFeatured
    } = query;

    const filter = {};
    if (category) filter.category = category;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (stockStatus === 'in_stock') {
      filter.quantity = { $gt: 0 };
    } else if (stockStatus === 'out_of_stock') {
      filter.quantity = { $lte: 0 };
    }

    const result = await ProductRepository.findAll(filter, { createdAt: -1 }, parseInt(limit), cursor);
    const total = await ProductRepository.count(filter);

    return {
      products: result.items,
      total,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };
  }

  async getPublicProductById(id) {
    const product = await ProductRepository.findOne({ _id: id, status: 'active', isActive: true });
    if (!product) {
      throw new AppError('Product not found or unavailable', HTTP_STATUS.NOT_FOUND);
    }
    return await FlashDealService.enrichProductsWithFlashDeals(product);
  }

  async getProductById(id) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }
    return product;
  }

  async updateProduct(id, data) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const updated = await ProductRepository.update(id, data);
    await this.invalidateCache();
    return updated;
  }

  async deleteProduct(id) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    await ProductRepository.delete(id);
    await this.invalidateCache();
    return true;
  }

  async toggleStatus(id, { status, isActive }) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await ProductRepository.update(id, updateData);
    await this.invalidateCache();
    return updated;
  }

  async toggleFeatured(id) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const updated = await ProductRepository.update(id, { isFeatured: !product.isFeatured });
    await this.invalidateCache();
    return updated;
  }

  /**
     * Dedicated method for Homepage Featured Section
     */
  async getFeaturedProducts(limit = 8) {
    const cacheKey = `public_products:featured:${limit}`;
    const cached = await Cache.get(cacheKey);
    if (cached) return cached;

    const filter = { isFeatured: true, status: 'active', isActive: true };
    const products = await ProductRepository.findActive(filter, { createdAt: -1 }, 1, parseInt(limit));

    const enrichedProducts = await FlashDealService.enrichProductsWithFlashDeals(products);

    await Cache.set(cacheKey, enrichedProducts, 600);
    return enrichedProducts;
  }

  async getPublicProducts(query) {
    const {
      limit = 12,
      cursor = null,
      category,
      search,
      minPrice,
      maxPrice,
      sort,
      stockStatus
    } = query;

    const cacheKey = `public_products:${JSON.stringify(query)}`;
    const cached = await Cache.get(cacheKey);
    if (cached) return cached;

    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$text = { $search: search };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (stockStatus === 'in_stock') {
      filter.quantity = { $gt: 0 };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const result = await ProductRepository.findActive(filter, sortOption, parseInt(limit), cursor);
    const total = await ProductRepository.count({ ...filter, status: 'active', isActive: true });

    const enrichedProducts = await FlashDealService.enrichProductsWithFlashDeals(result.items);

    const finalResult = {
      products: enrichedProducts,
      total,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };

    await Cache.set(cacheKey, finalResult, 300);

    return finalResult;
  }

  /**
     * Generate Excel Template for Bulk Product Import
     */
  async generateImportTemplate() {
    return await generateProductImportTemplate();
  }

  /**
     * @desc    Bulk Import Products from Excel
     */
  async bulkImportProducts(excelBuffer) {
    const parseResult = await parseProductExcel(excelBuffer);

    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.message,
        errors: parseResult.errors
      };
    }

    const products = parseResult.products;
    const uploadedImages = []; // Track images uploaded during synchronous phase if any

    // Offload to background worker for high-scale processing
    await productQueue.add('bulk-import', {
      type: 'BULK_IMPORT',
      data: {
        products,
        uploadedImages
      }
    });

    return {
      success: true,
      message: 'Bulk import has been queued and will be processed in the background.',
      totalQueued: products.length
    };
  }

  /**
   * Internal method called by worker to execute high-performance bulk writes
   */
  async executeBulkImport(products, existingUploadedImages = []) {
    const bulkOps = [];
    const uploadedImages = [...existingUploadedImages];
    const errors = [];

    try {
      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        const rowIndex = i + 3;

        try {
          const category = await ProductCategoryRepository.findByName(productData.categoryName);
          if (!category) throw new Error(`Category '${productData.categoryName}' not found`);
          productData.category = category._id;

          if (productData.subCategoryName) {
            const subCat = await ProductSubCategoryRepository.findByNameAndCategory(productData.subCategoryName, category._id);
            if (subCat) productData.subCategory = subCat._id;
          }

          const existingSku = await ProductRepository.findOne({ sku: productData.sku });
          if (existingSku) throw new Error(`SKU '${productData.sku}' already exists`);

          const imageFolder = 'products/bulk-import';
          if (productData._thumbnailUrl) {
            const thumb = await uploadImageFromUrl(productData._thumbnailUrl, imageFolder);
            productData.thumbnail = thumb;
            uploadedImages.push(thumb.publicId);
          }

          if (productData._imageUrls && productData._imageUrls.length > 0) {
            const images = await uploadMultipleImagesFromUrls(productData._imageUrls, imageFolder);
            productData.images = images;
            uploadedImages.push(...images.map(img => img.publicId));
            if (!productData.thumbnail) productData.thumbnail = images[0];
          }

          productData.status = 'active';
          productData.isActive = false;

          bulkOps.push({ insertOne: { document: productData } });

        } catch (error) {
          errors.push({ row: rowIndex, sku: productData.sku, error: error.message });
        }
      }

      if (bulkOps.length > 0) {
        await mongoose.model('Product').bulkWrite(bulkOps, { ordered: false });
        await this.invalidateCache();
      }

      if (errors.length > 0) {
        Logger.warn(`Bulk import finished with ${errors.length} errors`, { errors });
      }

      return { success: true, count: bulkOps.length, errors };

    } catch (error) {
      if (uploadedImages.length > 0) await deleteMultipleImages(uploadedImages);
      throw error; // Let worker handle retry
    }
  }

  /**
     * @desc    Get Low Stock Products for Admin
     */
  async getLowStockProducts(query) {
    const {
      limit = 10,
      cursor = null,
      threshold = 10,
      category,
      search,
      stockSort // 'asc' or 'desc'
    } = query;

    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { quantity: 1 }; // Default: Low to High
    if (stockSort === 'desc') sortOption = { quantity: -1 };

    const result = await ProductRepository.findLowStock(Number(threshold), filter, sortOption, parseInt(limit), cursor);
    const total = await ProductRepository.count({ ...filter, quantity: { $lte: Number(threshold) } });

    return {
      products: result.items,
      total,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };
  }

  /**
     * @desc    Restock Product (Atomic)
     */
  async restockProduct(id, quantity) {
    const product = await ProductRepository.incrementStock(id, quantity);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }
    await this.invalidateCache();
    return product;
  }

  /**
     * @desc    Optimized Search for Public Search Bar
     */
  async searchProducts(query, cursor = null, limit = 12) {
    if (!query) return { products: [], total: 0, nextCursor: null };

    const cacheKey = `search:${query}:${cursor}:${limit}`;
    const cached = await Cache.get(cacheKey);
    if (cached) return cached;

    const result = await ProductRepository.searchText(query, parseInt(limit), cursor);
    const total = await ProductRepository.count({
      $text: { $search: query },
      status: 'active',
      isActive: true
    });

    const enrichedProducts = await FlashDealService.enrichProductsWithFlashDeals(result.items);

    const finalResult = {
      products: enrichedProducts,
      total,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };

    // Cache for 10 minutes
    await Cache.set(cacheKey, finalResult, 600);
    return finalResult;
  }

  /**
     * @desc    Get Similar Products by Tags
     */
  async getSimilarProducts(productId, limit = 4) {
    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const cacheKey = `similar:${productId}:${limit}`;
    const cached = await Cache.get(cacheKey);
    if (cached) return cached;

    const products = await ProductRepository.findSimilarByTags(product.searchTags, productId, limit);
    const enrichedProducts = await FlashDealService.enrichProductsWithFlashDeals(products);

    // Cache similar products for 30 minutes
    await Cache.set(cacheKey, enrichedProducts, 1800);
    return enrichedProducts;
  }

  async invalidateCache() {
    // Pattern based invalidation for service-level and middleware-level cache
    await Cache.delByPattern('*product*');
    await Cache.delByPattern('response:/api/v1/products*');
    Logger.info('Product cache cleared globally');
  }
}

export default new ProductService();
