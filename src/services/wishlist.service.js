import WishlistRepository from '../repositories/wishlist.repository.js';
import ProductRepository from '../repositories/product.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';
// import ClearanceSaleService from './clearanceSale.service.js';
import FlashDealService from './flashDeal.service.js';
// import FeaturedDealService from './featuredDeal.service.js';
// import DealOfTheDayService from './dealOfTheDay.service.js';

const WISHLIST_SERVICE_CACHE_PREFIX = 'wishlistService:';

class WishlistService {
  /**
     * Get customer wishlist with enriched product details
     */
  async getWishlist(customerId) {
    const wishlist = await WishlistRepository.findByCustomer(customerId);

    if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
      return {
        items: [],
        totalItems: 0,
        message: 'Wishlist is empty'
      };
    }

    // Filter out inactive or deleted products
    const activeItems = wishlist.items.filter(item =>
      item.product &&
            item.product.isActive === true &&
            item.product.status === 'approved'
    );

    // Enrich products with active deals
    const enrichedItems = await this.enrichWishlistItems(activeItems);

    return {
      items: enrichedItems,
      totalItems: enrichedItems.length
    };
  }

  /**
     * Add product to wishlist
     */
  async addToWishlist(customerId, productId) {
    // 1. Validate product exists and is available
    const product = await ProductRepository.findById(productId);

    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND, 'PRODUCT_NOT_FOUND');
    }

    if (product.status !== 'approved' || !product.isActive) {
      throw new AppError('Product is not available', HTTP_STATUS.BAD_REQUEST, 'PRODUCT_UNAVAILABLE');
    }

    // 2. Check if already in wishlist
    const isInWishlist = await WishlistRepository.isProductInWishlist(customerId, productId);

    if (isInWishlist) {
      throw new AppError('Product is already in your wishlist', HTTP_STATUS.CONFLICT, 'ALREADY_IN_WISHLIST');
    }

    // 3. Add to wishlist
    await WishlistRepository.addProduct(customerId, productId);

    Logger.info('Product added to wishlist', {
      customerId,
      productId
    });

    return await this.getWishlist(customerId);
  }

  /**
     * Remove product from wishlist
     */
  async removeFromWishlist(customerId, productId) {
    await WishlistRepository.removeProduct(customerId, productId);

    Logger.info('Product removed from wishlist', {
      customerId,
      productId
    });

    return await this.getWishlist(customerId);
  }

  /**
     * Check if product is in wishlist
     */
  async isInWishlist(customerId, productId) {
    const isInWishlist = await WishlistRepository.isProductInWishlist(customerId, productId);

    return {
      isInWishlist
    };
  }

  /**
     * Clear entire wishlist
     */
  async clearWishlist(customerId) {
    await WishlistRepository.clearWishlist(customerId);

    Logger.info('Wishlist cleared', { customerId });

    return {
      items: [],
      totalItems: 0,
      message: 'Wishlist cleared successfully'
    };
  }

  /**
   * Enrich wishlist items with deals and pricing (OPTIMIZED - No N+1)
   */
  async enrichWishlistItems(items) {
    if (!items || items.length === 0) return [];

    const enrichedItems = [];

    // Batch process all products at once
    const products = items.map(item => item.product);
    
    // Single call to FlashDealService for all products (not N+1 queries!)
    const enrichedProducts = await FlashDealService.enrichProductsWithFlashDeals(products);
    
    // Create product lookup map for O(1) access
    const productDealMap = new Map();
    enrichedProducts.forEach((enrichedProduct, index) => {
      productDealMap.set(products[index]._id.toString(), enrichedProduct);
    });

    for (const item of items) {
      const product = item.product;
      const withFlash = productDealMap.get(product._id.toString()) || {};

      // Calculate base price (with product discount if any)
      let basePrice = product.price;
      if (product.discount > 0) {
        if (product.discountType === 'flat') {
          basePrice = product.price - product.discount;
        } else if (product.discountType === 'percent') {
          basePrice = product.price - (product.price * product.discount / 100);
        }
      }

      // Check for active deals
      let finalPrice = basePrice;
      let activeDeal = null;

      // Use pre-fetched deal data (no database query!)
      if (withFlash.flashDeal) {
        finalPrice = withFlash.flashPrice;
        activeDeal = { type: 'flash', ...withFlash.flashDeal };
      }

      enrichedItems.push({
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          thumbnail: product.thumbnail,
          price: product.price,
          discount: product.discount,
          discountType: product.discountType,
          quantity: product.quantity
        },
        basePrice: parseFloat(basePrice.toFixed(2)),
        finalPrice: parseFloat(finalPrice.toFixed(2)),
        activeDeal,
        addedAt: item.addedAt
      });
    }

    return enrichedItems;
  }

  /**
   * Invalidate wishlist cache (Service Level)
   */
  async invalidateWishlistCache(customerId = null) {
    const patterns = [];
    
    if (customerId) {
      patterns.push(`${WISHLIST_SERVICE_CACHE_PREFIX}customer:${customerId}:*`);
    } else {
      patterns.push(`${WISHLIST_SERVICE_CACHE_PREFIX}*`);
    }
    
    for (const pattern of patterns) {
      await MultiLayerCache.delByPattern(pattern);
    }
    
    Logger.debug('Wishlist service cache invalidated', { customerId, patterns });
  }

  /**
   * Get wishlist summary with caching
   */
  async getWishlistSummary(customerId) {
    const cacheKey = `${WISHLIST_SERVICE_CACHE_PREFIX}customer:${customerId}:summary`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      const wishlist = await WishlistRepository.findByCustomer(customerId);
      
      if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
        return {
          itemCount: 0,
          totalValue: 0,
          recentlyAdded: [],
          categories: []
        };
      }
      
      const activeItems = wishlist.items.filter(item =>
        item.product &&
        item.product.isActive === true &&
        item.product.status === 'approved'
      );
      
      const itemCount = activeItems.length;
      const totalValue = activeItems.reduce((sum, item) => sum + (item.product.price * (item.product.quantity || 1)), 0);
      
      // Get recently added (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentlyAdded = activeItems.filter(item => new Date(item.addedAt) > sevenDaysAgo);
      
      // Extract categories
      const categories = [...new Set(activeItems.map(item => item.product.category).filter(Boolean))];
      
      return {
        itemCount,
        totalValue: parseFloat(totalValue.toFixed(2)),
        recentlyAddedCount: recentlyAdded.length,
        categories: categories.slice(0, 5), // Top 5 categories
        recentlyAdded: recentlyAdded.slice(0, 3).map(item => ({
          productId: item.product._id,
          name: item.product.name,
          thumbnail: item.product.thumbnail,
          addedAt: item.addedAt
        }))
      };
    }, 600); // 10 minutes cache for wishlist summary
  }

  /**
   * Get wishlist with enhanced caching
   */
  async getWishlistCached(customerId) {
    const cacheKey = `${WISHLIST_SERVICE_CACHE_PREFIX}customer:${customerId}:full`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      return await this.getWishlist(customerId);
    }, 900); // 15 minutes cache for full wishlist
  }
}

export default new WishlistService();
