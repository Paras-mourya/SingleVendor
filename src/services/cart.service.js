import CartRepository from '../repositories/cart.repository.js';
import ProductRepository from '../repositories/product.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';
import TransactionManager from '../utils/transaction.js';

const CART_SERVICE_CACHE_PREFIX = 'cartService:';

class CartService {
  /**
     * Add Item to Cart (Guest or Auth)
     */
  async addToCart({ userId, guestId, productId, quantity, variation = null }) {
    return await TransactionManager.execute(async (session) => {
      Logger.info(`Adding product ${productId} to cart`, { userId, guestId, quantity });

      // 1. Check product and stock
      const product = await ProductRepository.findById(productId, '', true);
      if (!product) {
        throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
      }

      if (!product.isActive) {
        throw new AppError('Product is not available', HTTP_STATUS.BAD_REQUEST);
      }

      if (product.stock < quantity) {
        throw new AppError(`Only ${product.stock} items available in stock`, HTTP_STATUS.BAD_REQUEST);
      }

      // 2. Find or create cart
      const filter = userId ? { customerId: userId } : { guestId };
      let cart = await CartRepository.findOne(filter);

      if (!cart) {
        cart = await CartRepository.create({
          ...(userId ? { customerId: userId } : { guestId }),
          items: [{
            product: productId,
            quantity,
            price: product.price, // We store price at time of adding
            variation
          }]
        }, { session });
      } else {
        // Check if product already in cart with same variation
        const itemIndex = cart.items.findIndex(item =>
          item.product.toString() === productId &&
          JSON.stringify(item.variation) === JSON.stringify(variation)
        );

        if (itemIndex > -1) {
          // Update quantity
          const newQuantity = cart.items[itemIndex].quantity + quantity;
          if (product.stock < newQuantity) {
            throw new AppError(`Cannot add more. Total in cart (${newQuantity}) exceeds stock (${product.stock})`, HTTP_STATUS.BAD_REQUEST);
          }
          cart.items[itemIndex].quantity = newQuantity;
          cart.items[itemIndex].price = product.price; // Update to current price
        } else {
          // Add new item
          cart.items.push({
            product: productId,
            quantity,
            price: product.price,
            variation
          });
        }
        await cart.save({ session });
      }

      return await CartRepository.findById(cart._id, '', true);
    });
  }

  /**
     * Update Cart Item Quantity
     */
  async updateCartItem({ userId, guestId, productId, quantity, variationId = null }) {
    const filter = userId ? { customerId: userId } : { guestId };
    const cart = await CartRepository.findOne(filter);

    if (!cart) {
      throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND);
    }

    const item = cart.items.find(item =>
      item.product._id.toString() === productId &&
      (variationId ? item._id.toString() === variationId : true)
    );

    if (!item) {
      throw new AppError('Item not found in cart', HTTP_STATUS.NOT_FOUND);
    }

    // Check stock
    const product = await ProductRepository.findById(productId, '', true);
    if (product.stock < quantity) {
      throw new AppError(`Only ${product.stock} items available in stock`, HTTP_STATUS.BAD_REQUEST);
    }

    item.quantity = quantity;
    item.price = product.price; // Ensure current price is reflected
    await cart.save();

    return cart;
  }

  /**
     * Remove Item from Cart
     */
  async removeFromCart({ userId, guestId, productId, variationId = null }) {
    const filter = userId ? { customerId: userId } : { guestId };
    const cart = await CartRepository.findOne(filter);

    if (!cart) {
      throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND);
    }

    cart.items = cart.items.filter(item =>
      !(item.product._id.toString() === productId &&
        (variationId ? item._id.toString() === variationId : true))
    );

    await cart.save();
    return cart;
  }

  /**
     * Get Cart Contents
     */
  async getCart({ userId, guestId }) {
    const filter = userId ? { customerId: userId } : { guestId };
    const cart = await CartRepository.findOne(filter, '', true);
    return cart || { items: [], totalPrice: 0 };
  }

  /**
     * Merge Guest Cart into Customer Cart on Login
     */
  async mergeGuestCart(guestId, customerId) {
    return await TransactionManager.execute(async (session) => {
      const guestCart = await CartRepository.findByGuestId(guestId);
      if (!guestCart || guestCart.items.length === 0) return null;

      let customerCart = await CartRepository.findByCustomerId(customerId);

      if (!customerCart) {
        // Assign guest cart to customer
        guestCart.customerId = customerId;
        guestCart.guestId = null;
        await guestCart.save({ session });
        Logger.info(`Guest cart ${guestId} assigned to customer ${customerId}`);
        return guestCart;
      }

      // Merge items
      for (const guestItem of guestCart.items) {
        const existingItemIndex = customerCart.items.findIndex(item =>
          item.product._id.toString() === guestItem.product._id.toString() &&
          JSON.stringify(item.variation) === JSON.stringify(guestItem.variation)
        );

        if (existingItemIndex > -1) {
          // Update quantity (sum up)
          customerCart.items[existingItemIndex].quantity += guestItem.quantity;
        } else {
          // Add new item from guest cart
          customerCart.items.push(guestItem);
        }
      }

      await customerCart.save({ session });
      await CartRepository.deleteById(guestCart._id); // Delete guest cart after merge

      Logger.info(`Guest cart ${guestId} merged into customer cart ${customerId}`);
      return customerCart;
    });
  }

  /**
   * Apply Coupon to Cart
   */
  async applyCoupon({ userId, guestId, code }) {
    const filter = userId ? { customerId: userId } : { guestId };
    const cart = await CartRepository.findOne(filter);

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cannot apply coupon to an empty cart', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. Calculate current subtotal (with item discounts)
    const summary = this._calculateCartTotals(cart);
    const discountedSubtotal = summary.subtotalMRP - summary.storeDiscount;

    // 2. Validate Coupon via CouponService
    const CouponService = (await import('./coupon.service.js')).default;
    const coupon = await CouponService.validateCoupon(code, userId, discountedSubtotal);

    // 3. Attach Coupon to Cart
    cart.appliedCoupon = coupon._id;
    await cart.save();

    // Invalidate summary cache
    await this.invalidateCartCache(userId, guestId);

    return await CartRepository.findById(cart._id);
  }

  /**
   * Remove Coupon from Cart
   */
  async removeCoupon({ userId, guestId }) {
    const filter = userId ? { customerId: userId } : { guestId };
    const cart = await CartRepository.findOne(filter);

    if (cart) {
      cart.appliedCoupon = null;
      await cart.save();
      await this.invalidateCartCache(userId, guestId);
    }

    return cart;
  }

  /**
     * Clear Cart
     */
  async clearCart({ userId, guestId }) {
    const filter = userId ? { customerId: userId } : { guestId };
    const result = await CartRepository.deleteById((await CartRepository.findOne(filter))._id);

    // Invalidate service-level cache
    await this.invalidateCartCache(userId, guestId);

    return result;
  }

  /**
   * Invalidate cart cache (Service Level)
   */
  async invalidateCartCache(userId = null, guestId = null) {
    const patterns = [];

    if (userId) {
      patterns.push(`${CART_SERVICE_CACHE_PREFIX}user:${userId}:*`);
    }
    if (guestId) {
      patterns.push(`${CART_SERVICE_CACHE_PREFIX}guest:${guestId}:*`);
    }

    // Clear all cart service caches if no specific ID
    if (!userId && !guestId) {
      patterns.push(`${CART_SERVICE_CACHE_PREFIX}*`);
    }

    for (const pattern of patterns) {
      await MultiLayerCache.delByPattern(pattern);
    }

    Logger.debug('Cart service cache invalidated', { userId, guestId, patterns });
  }

  /**
   * Get cart summary with caching
   */
  async getCartSummary({ userId, guestId }) {
    const cacheKey = userId
      ? `${CART_SERVICE_CACHE_PREFIX}user:${userId}:summary`
      : `${CART_SERVICE_CACHE_PREFIX}guest:${guestId}:summary`;

    return await MultiLayerCache.get(cacheKey, async () => {
      const cart = userId
        ? await CartRepository.findByCustomerId(userId, true)
        : await CartRepository.findByGuestId(guestId, true);

      if (!cart || !cart.items || cart.items.length === 0) {
        return {
          itemCount: 0,
          subtotalMRP: 0,
          storeDiscount: 0,
          couponDiscount: 0,
          shippingTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          items: []
        };
      }

      // Fetch active clearance sale for calculations
      const ClearanceSaleService = (await import('./clearanceSale.service.js')).default;
      const activeSale = await ClearanceSaleService.getActiveSale();

      return this._calculateCartTotals(cart, activeSale);
    }, 300); // 5 minutes cache for cart summary
  }

  /**
   * Internal calculation engine for Cart Summary
   * @private
   */
  _calculateCartTotals(cart, activeSale = null) {
    let subtotalMRP = 0;
    let storeDiscount = 0;
    let shippingTotal = 0;
    let taxTotal = 0;

    // Set to track products for non-multiplied shipping
    const shippingTracked = new Set();

    const items = cart.items.map(item => {
      const p = item.product;
      const qty = item.quantity;

      // 1. MRP calculation
      const mrp = p.price * qty;
      subtotalMRP += mrp;

      // 2. Store Discount (Product Discount + Clearance Sale)
      // Layer 1: Normal Product Discount
      let productDiscountAmount = 0;
      if (p.discount > 0) {
        if (p.discountType === 'percent') {
          productDiscountAmount = (p.price * p.discount) / 100;
        } else {
          productDiscountAmount = p.discount;
        }
      }

      // Layer 2: Clearance Sale Discount
      let clearancePercent = 0;
      if (activeSale && activeSale.isActive) {
        const saleProduct = activeSale.products?.find(sp => sp.product?._id?.toString() === p._id?.toString() || sp.product?.toString() === p._id?.toString());
        if (saleProduct && saleProduct.isActive) {
          clearancePercent = activeSale.discountType === 'flat' ? activeSale.discountAmount : saleProduct.discount;
        }
      }
      const clearanceDiscountAmount = (p.price * clearancePercent) / 100;

      // BEST DEAL LOGIC: Pick the highest monetary discount (Product vs Clearance)
      const bestItemDiscountAmount = Math.max(productDiscountAmount, clearanceDiscountAmount);

      const totalItemStoreDiscount = bestItemDiscountAmount * qty;
      storeDiscount += totalItemStoreDiscount;

      // 3. Tax calculation (On Best Discounted Price)
      const discountedPrice = p.price - bestItemDiscountAmount;
      let itemTax = 0;
      if (p.tax > 0) {
        if (p.taxType === 'percent') {
          itemTax = (discountedPrice * p.tax) / 100;
        } else {
          itemTax = p.tax;
        }
      }
      taxTotal += (itemTax * qty);

      // 4. Shipping calculation
      let itemShipping = 0;
      if (p.shippingCost > 0) {
        if (p.multiplyShippingCost) {
          itemShipping = p.shippingCost * qty;
        } else if (!shippingTracked.has(p._id.toString())) {
          itemShipping = p.shippingCost;
          shippingTracked.add(p._id.toString());
        }
      }
      shippingTotal += itemShipping;

      return {
        productId: p._id,
        name: p.name,
        thumbnail: p.thumbnail?.url,
        quantity: qty,
        unitPrice: p.price,
        discountedPrice: discountedPrice,
        tax: itemTax,
        shipping: itemShipping,
        totalItemPrice: (discountedPrice * qty)
      };
    });

    // 5. Coupon Discount
    let couponDiscount = 0;
    if (cart.appliedCoupon) {
      const discountedSubtotal = subtotalMRP - storeDiscount;
      const coupon = cart.appliedCoupon;

      if (coupon.type === 'discount_on_purchase') {
        if (coupon.discountType === 'percent') {
          couponDiscount = (discountedSubtotal * coupon.discountAmount) / 100;
        } else {
          couponDiscount = coupon.discountAmount;
        }
      } else if (coupon.type === 'free_delivery') {
        couponDiscount = 0; // Handled by zeroing shipping later if needed
        shippingTotal = 0;
      }
    }

    const grandTotal = Math.max(0, (subtotalMRP - storeDiscount - couponDiscount + shippingTotal + taxTotal));

    return {
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalMRP,
      storeDiscount,
      couponDiscount,
      shippingTotal,
      taxTotal,
      grandTotal,
      items
    };
  }
}

export default new CartService();
