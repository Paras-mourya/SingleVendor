import Wishlist from '../models/wishlist.model.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';

const WISHLIST_CACHE_PREFIX = 'wishlist:';

class WishlistRepository {
  /**
     * Find wishlist by customer ID
     */
  async findByCustomer(customerId) {
    const cacheKey = `${WISHLIST_CACHE_PREFIX}customer:${customerId}`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      return await Wishlist.findOne({ customerId: customerId })
        .populate({
          path: 'items.product',
          select: 'name slug price discount discountType thumbnail quantity isActive status vendor'
        })
        .lean()
        .exec();
    }, 1200); // 20 minutes cache for wishlist data
  }

  /**
     * Add product to wishlist
     */
  async addProduct(customerId, productId) {
    const result = await Wishlist.findOneAndUpdate(
      { customerId: customerId },
      {
        $addToSet: { // Prevents duplicates
          items: {
            product: productId,
            addedAt: new Date()
          }
        }
      },
      { new: true, upsert: true } // Create wishlist if doesn't exist
    )
      .populate({
        path: 'items.product',
        select: 'name slug price discount discountType thumbnail quantity isActive status vendor'
      })
      .exec();
    
    // Invalidate wishlist cache
    await MultiLayerCache.del(`${WISHLIST_CACHE_PREFIX}customer:${customerId}`);
    
    return result;
  }

  /**
     * Remove product from wishlist
     */
  async removeProduct(customerId, productId) {
    const result = await Wishlist.findOneAndUpdate(
      { customerId: customerId },
      {
        $pull: { items: { product: productId } }
      },
      { new: true }
    )
      .populate({
        path: 'items.product',
        select: 'name slug price discount discountType thumbnail quantity isActive status vendor'
      })
      .exec();
    
    // Invalidate wishlist cache
    await MultiLayerCache.del(`${WISHLIST_CACHE_PREFIX}customer:${customerId}`);
    
    return result;
  }

  /**
     * Check if product is in wishlist
     */
  async isProductInWishlist(customerId, productId) {
    const cacheKey = `${WISHLIST_CACHE_PREFIX}check:${customerId}:${productId}`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      const wishlist = await Wishlist.findOne({
        customerId: customerId,
        'items.product': productId
      }).lean().exec();

      return !!wishlist;
    }, 600); // 10 minutes cache for wishlist checks
  }

  /**
     * Clear entire wishlist
     */
  async clearWishlist(customerId) {
    const result = await Wishlist.findOneAndUpdate(
      { customerId: customerId },
      {
        $set: { items: [] }
      },
      { new: true }
    ).exec();
    
    // Invalidate wishlist cache
    await MultiLayerCache.del(`${WISHLIST_CACHE_PREFIX}customer:${customerId}`);
    await MultiLayerCache.delByPattern(`${WISHLIST_CACHE_PREFIX}check:${customerId}:*`);
    
    return result;
  }

  /**
     * Get wishlist item count
     */
  async getItemCount(customerId) {
    const cacheKey = `${WISHLIST_CACHE_PREFIX}count:${customerId}`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      const wishlist = await Wishlist.findOne({ customerId: customerId })
        .select('items')
        .lean()
        .exec();

      return wishlist ? wishlist.items.length : 0;
    }, 900); // 15 minutes cache for item count
  }
}

export default new WishlistRepository();
