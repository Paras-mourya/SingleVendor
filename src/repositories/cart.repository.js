import Cart from '../models/cart.model.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';

const CART_CACHE_PREFIX = 'cart:';
const CART_LIST_CACHE_PREFIX = 'cart:list:';

class CartRepository {
  async findByCustomerId(customerId, lean = false) {
    const cacheKey = `${CART_CACHE_PREFIX}customer:${customerId}`;

    return await MultiLayerCache.get(cacheKey, async () => {
      Logger.debug(`DB: Finding cart for customer: ${customerId}`);
      const query = Cart.findOne({ customerId }).populate('items.product', 'name thumbnail price stock unit tax taxType discount discountType shippingCost multiplyShippingCost').populate('appliedCoupon');
      return lean ? await query.lean() : await query;
    }, 900); // 15 minutes cache for customer carts
  }

  async findByGuestId(guestId, lean = false) {
    const cacheKey = `${CART_CACHE_PREFIX}guest:${guestId}`;

    return await MultiLayerCache.get(cacheKey, async () => {
      Logger.debug(`DB: Finding cart for guest: ${guestId}`);
      const query = Cart.findOne({ guestId }).populate('items.product', 'name thumbnail price stock unit tax taxType discount discountType shippingCost multiplyShippingCost').populate('appliedCoupon');
      return lean ? await query.lean() : await query;
    }, 600); // 10 minutes cache for guest carts
  }

  async create(cartData) {
    const cart = await Cart.create(cartData);
    Logger.debug('DB: Creating new cart', { cartData });

    // Invalidate relevant caches
    if (cart.customerId) {
      await MultiLayerCache.del(`${CART_CACHE_PREFIX}customer:${cart.customerId}`);
    }
    if (cart.guestId) {
      await MultiLayerCache.del(`${CART_CACHE_PREFIX}guest:${cart.guestId}`);
    }

    return cart;
  }

  async findOne(filter, lean = false) {
    const query = Cart.findOne(filter).populate('items.product', 'name thumbnail price stock unit tax taxType discount discountType shippingCost multiplyShippingCost').populate('appliedCoupon');
    return lean ? await query.lean() : await query;
  }

  async updateById(id, updateData, options = { new: true }) {
    Logger.debug(`DB: Updating cart ID: ${id}`);

    // Get cart info before update for cache invalidation
    const existingCart = await Cart.findById(id);

    const result = await Cart.findByIdAndUpdate(id, updateData, options).populate('items.product', 'name thumbnail price stock unit tax taxType discount discountType shippingCost multiplyShippingCost').populate('appliedCoupon');

    // Invalidate relevant caches
    if (existingCart?.customerId) {
      await MultiLayerCache.del(`${CART_CACHE_PREFIX}customer:${existingCart.customerId}`);
    }
    if (existingCart?.guestId) {
      await MultiLayerCache.del(`${CART_CACHE_PREFIX}guest:${existingCart.guestId}`);
    }

    return result;
  }

  async deleteById(id) {
    Logger.debug(`DB: Deleting cart ID: ${id}`);

    // Get cart info before delete for cache invalidation
    const existingCart = await Cart.findById(id);

    const result = await Cart.findByIdAndDelete(id);

    // Invalidate relevant caches
    if (existingCart?.customerId) {
      await MultiLayerCache.del(`${CART_CACHE_PREFIX}customer:${existingCart.customerId}`);
    }
    if (existingCart?.guestId) {
      await MultiLayerCache.del(`${CART_CACHE_PREFIX}guest:${existingCart.guestId}`);
    }

    return result;
  }
}

export default new CartRepository();
