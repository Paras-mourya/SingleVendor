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
     * Add Item to Cart (Guest or Auth) - Optimized to avoid N+1 queries
     */
  async addToCart({ userId, guestId, productId, quantity, variation = null }) {
    return await TransactionManager.execute(async (session) => {
      Logger.info(`Adding product ${productId} to cart`, { userId, guestId, quantity });

      // 1. Bulk product and stock check (single query)
      const stockMap = await ProductRepository.checkStockBulk([productId]);
      const productStock = stockMap[productId];
      
      if (!productStock) {
        throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
      }

      // 2. Get full product details (cached)
      const product = await ProductRepository.findById(productId, 'name price isActive stock', true);
      if (!product || !product.isActive) {
        throw new AppError('Product is not available', HTTP_STATUS.BAD_REQUEST);
      }

      if (productStock.stock < quantity) {
        throw new AppError(`Only ${productStock.stock} items available in stock`, HTTP_STATUS.BAD_REQUEST);
      }

      // 3. Find or create cart
      const filter = userId ? { customerId: userId } : { guestId };
      let cart = await CartRepository.findOne(filter);

      if (!cart) {
        cart = await CartRepository.create({
          ...(userId ? { customerId: userId } : { guestId }),
          items: [{
            product: productId,
            quantity,
            price: product.price,
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
          if (productStock.stock < newQuantity) {
            throw new AppError(`Cannot add more. Total in cart (${newQuantity}) exceeds stock (${productStock.stock})`, HTTP_STATUS.BAD_REQUEST);
          }
          cart.items[itemIndex].quantity = newQuantity;
          cart.items[itemIndex].price = product.price;
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
     * Update Cart Item Quantity - Optimized to avoid N+1 queries
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

    // Bulk stock check (single query)
    const stockMap = await ProductRepository.checkStockBulk([productId]);
    const productStock = stockMap[productId];
    
    if (!productStock) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    if (productStock.stock < quantity) {
      throw new AppError(`Only ${productStock.stock} items available in stock`, HTTP_STATUS.BAD_REQUEST);
    }

    // Get current product price (cached)
    const product = await ProductRepository.findById(productId, 'price', true);
    
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
   * Calculate final price with best discount stacking (Product vs Clearance Sale)
   * Flash deals are for display only - no discounts
   * ENTERPRISE-GRADE: Race condition, edge case, and bug handling
   */
  async calculateFinalPrice(item, product, appliedCoupon = null, clearanceSaleDiscount = 0, flashDealDiscount = 0) {
    // 🔥 CRITICAL: Input validation with NaN/null handling
    if (!product || !item) {
      throw new Error('Invalid product or item data');
    }
    
    const productPrice = Number(product.price);
    const itemQuantity = Number(item.quantity);
    
    if (isNaN(productPrice) || productPrice < 0) {
      throw new Error(`Invalid product price: ${product.price}`);
    }
    
    if (isNaN(itemQuantity) || itemQuantity <= 0 || !Number.isInteger(itemQuantity)) {
      throw new Error(`Invalid item quantity: ${item.quantity}`);
    }

    // 🔥 CRITICAL: Handle extreme values and edge cases
    const basePrice = Math.max(0, Math.min(productPrice, 999999999.99)); // Cap at reasonable max
    const quantity = Math.max(1, Math.min(itemQuantity, 999999)); // Cap quantity
    
    let discountBreakdown = {
      basePrice,
      productDiscount: 0,
      clearanceSaleDiscount: 0,
      bestBaseDiscount: 0,
      bestBaseDiscountType: 'none',
      couponDiscount: 0,
      finalPrice: basePrice,
      quantity,
      itemSubtotal: 0,
      itemDiscount: 0,
      itemTotal: 0
    };

    // 🔥 CRITICAL: Discount validation with strict bounds
    const discounts = [];
    
    // 1. Product-level discount with validation
    const productDiscount = Number(product.discount) || 0;
    if (productDiscount > 0 && productDiscount <= 100 && product.discountType) {
      let discountAmount = 0;
      if (product.discountType === 'percent') {
        discountAmount = Math.min((basePrice * productDiscount) / 100, basePrice);
      } else if (product.discountType === 'flat') {
        discountAmount = Math.min(productDiscount, basePrice);
      }
      
      if (discountAmount > 0.01) { // Only apply if discount is meaningful
        discounts.push({
          type: 'product',
          amount: Math.round(discountAmount * 100) / 100, // Round early to prevent float errors
          percentage: product.discountType === 'percent' ? productDiscount : (discountAmount / basePrice * 100)
        });
        discountBreakdown.productDiscount = discounts[discounts.length - 1].amount;
      }
    }

    // 2. Clearance Sale discount with validation
    const clearanceDiscount = Number(clearanceSaleDiscount) || 0;
    if (clearanceDiscount > 0 && clearanceDiscount <= 100) {
      const discountAmount = Math.min((basePrice * clearanceDiscount) / 100, basePrice);
      
      if (discountAmount > 0.01) {
        discounts.push({
          type: 'clearanceSale',
          amount: Math.round(discountAmount * 100) / 100,
          percentage: clearanceDiscount
        });
        discountBreakdown.clearanceSaleDiscount = discounts[discounts.length - 1].amount;
      }
    }

    // 🔥 CRITICAL: Best discount selection with tie-breaking
    if (discounts.length > 0) {
      const bestDiscount = discounts.reduce((best, current) => {
        // Tie-breaking: prefer clearanceSale over product for business logic
        if (Math.abs(current.amount - best.amount) < 0.01) {
          return current.type === 'clearanceSale' ? current : best;
        }
        return current.amount > best.amount ? current : best;
      });
      
      discountBreakdown.bestBaseDiscount = bestDiscount.amount;
      discountBreakdown.bestBaseDiscountType = bestDiscount.type;
      basePrice = Math.max(0, basePrice - bestDiscount.amount);
    }

    // 3. Coupon discount with comprehensive validation
    if (appliedCoupon && appliedCoupon.type === 'discount_on_purchase' && appliedCoupon.isActive) {
      const itemSubtotal = basePrice * quantity;
      let couponDiscount = 0;
      
      const couponAmount = Number(appliedCoupon.discountAmount) || 0;
      if (couponAmount > 0) {
        if (appliedCoupon.discountType === 'percent' && couponAmount <= 100) {
          couponDiscount = Math.min((itemSubtotal * couponAmount) / 100, itemSubtotal);
        } else if (appliedCoupon.discountType === 'amount') {
          couponDiscount = Math.min(couponAmount, itemSubtotal);
        }
        
        // 🔥 CRITICAL: Minimum purchase validation
        const minPurchase = Number(appliedCoupon.minPurchase) || 0;
        if (minPurchase > 0 && itemSubtotal < minPurchase) {
          couponDiscount = 0; // Coupon not applicable
        }
      }
      
      discountBreakdown.couponDiscount = Math.round((couponDiscount / quantity) * 100) / 100;
      basePrice = Math.max(0, basePrice - discountBreakdown.couponDiscount);
    }

    // 🔥 CRITICAL: Final calculations with precision handling
    discountBreakdown.finalPrice = Math.max(0, Math.round(basePrice * 100) / 100);
    discountBreakdown.itemSubtotal = Math.round(discountBreakdown.basePrice * quantity * 100) / 100;
    discountBreakdown.itemDiscount = Math.round((discountBreakdown.basePrice - discountBreakdown.finalPrice) * quantity * 100) / 100;
    discountBreakdown.itemTotal = Math.round(discountBreakdown.finalPrice * quantity * 100) / 100;
    
    // 🔥 CRITICAL: Consistency check
    const calculatedTotal = Math.round((discountBreakdown.itemSubtotal - discountBreakdown.itemDiscount) * 100) / 100;
    if (Math.abs(discountBreakdown.itemTotal - calculatedTotal) > 0.01) {
      Logger.error('Calculation inconsistency detected', {
        itemTotal: discountBreakdown.itemTotal,
        calculatedTotal,
        breakdown: discountBreakdown
      });
      discountBreakdown.itemTotal = calculatedTotal;
    }
    
    return discountBreakdown;
  }
  /**
   * Get cart summary with caching - ENTERPRISE-GRADE with race condition handling
   */
  async getCartSummary({ userId, guestId }) {
    // 🔥 CRITICAL: Generate consistent cache key
    const cacheKey = userId
      ? `${CART_SERVICE_CACHE_PREFIX}user:${userId}:summary`
      : `${CART_SERVICE_CACHE_PREFIX}guest:${guestId}:summary`;

    return await MultiLayerCache.get(cacheKey, async () => {
      // 🔥 CRITICAL: Handle concurrent cart access
      const cart = userId
        ? await CartRepository.findByCustomerId(userId, true)
        : await CartRepository.findByGuestId(guestId, true);

      if (!cart || !cart.items || cart.items.length === 0) {
        return {
          itemCount: 0,
          totalAmount: 0,
          subtotal: 0,
          totalDiscount: 0,
          items: []
        };
      }

      // 🔥 CRITICAL: Validate cart items before processing
      const validItems = cart.items.filter(item => 
        item && item.product && item.quantity > 0 && item.quantity <= 999999
      );

      if (validItems.length === 0) {
        return {
          itemCount: 0,
          totalAmount: 0,
          subtotal: 0,
          totalDiscount: 0,
          items: []
        };
      }

      // Extract product IDs for bulk loading
      const productIds = [...new Set(validItems.map(item => item.product._id.toString()))];
      
      // 🔥 CRITICAL: Parallel data fetching with timeout protection
      const [products, flashDeals, clearanceSales] = await Promise.all([
        ProductRepository.findByIds(
          productIds, 
          'name thumbnail price stock unit tax taxType discount discountType shippingCost multiplyShippingCost'
        ).catch(err => {
          Logger.error('Product fetch failed', { error: err.message, productIds });
          return [];
        }),
        this.getActiveFlashDealsForProducts(productIds).catch(err => {
          Logger.error('Flash deals fetch failed', { error: err.message });
          return {};
        }),
        this.getActiveClearanceSalesForProducts(productIds).catch(err => {
          Logger.error('Clearance sales fetch failed', { error: err.message });
          return {};
        })
      ]);
      
      // Create product map for quick lookup
      const productMap = {};
      products.forEach(product => {
        if (product && product._id) {
          productMap[product._id.toString()] = product;
        }
      });

      // 🔥 CRITICAL: Process items with comprehensive error handling
      const enrichedItems = validItems.map(item => {
        const product = productMap[item.product._id.toString()];
        const flashDealDiscount = flashDeals[item.product._id.toString()] || 0;
        const clearanceSaleDiscount = clearanceSales[item.product._id.toString()] || 0;
        
        // Handle unavailable products
        if (!product) {
          const itemPrice = Math.max(0, Number(item.price) || 0);
          const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, 999999));
          
          return {
            ...item,
            product: {
              _id: item.product._id,
              name: 'Product Unavailable',
              thumbnail: null,
              price: itemPrice,
              stock: 0
            },
            finalPrice: itemPrice,
            itemTotal: itemPrice * quantity,
            discountBreakdown: {
              basePrice: itemPrice,
              productDiscount: 0,
              flashDealDiscount: 0,
              clearanceSaleDiscount: 0,
              bestBaseDiscount: 0,
              bestBaseDiscountType: 'none',
              couponDiscount: 0,
              finalPrice: itemPrice,
              quantity,
              itemSubtotal: itemPrice * quantity,
              itemDiscount: 0,
              itemTotal: itemPrice * quantity
            }
          };
        }

        try {
          // 🔥 CRITICAL: Validate coupon before applying
          let validCoupon = null;
          if (cart.appliedCoupon) {
            const now = new Date();
            const couponStart = new Date(cart.appliedCoupon.startDate);
            const couponEnd = new Date(cart.appliedCoupon.expireDate);
            
            if (cart.appliedCoupon.isActive && 
                now >= couponStart && 
                now <= couponEnd &&
                cart.appliedCoupon.type === 'discount_on_purchase') {
              validCoupon = cart.appliedCoupon;
            }
          }

          const priceCalculation = this.calculateFinalPrice(
            item, 
            product, 
            validCoupon, 
            clearanceSaleDiscount, 
            flashDealDiscount
          );

          return {
            ...item,
            product,
            finalPrice: priceCalculation.finalPrice,
            itemTotal: priceCalculation.itemTotal,
            discountBreakdown: priceCalculation
          };
        } catch (error) {
          // 🔥 CRITICAL: Fallback with detailed logging
          Logger.error('Price calculation error, using fallback', { 
            productId: product._id, 
            error: error.message,
            stack: error.stack
          });
          
          const fallbackPrice = Math.max(0, Number(product.price) || 0);
          const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, 999999));
          
          return {
            ...item,
            product,
            finalPrice: fallbackPrice,
            itemTotal: fallbackPrice * quantity,
            discountBreakdown: {
              basePrice: fallbackPrice,
              productDiscount: 0,
              flashDealDiscount: 0,
              clearanceSaleDiscount: 0,
              bestBaseDiscount: 0,
              bestBaseDiscountType: 'none',
              couponDiscount: 0,
              finalPrice: fallbackPrice,
              quantity,
              itemSubtotal: fallbackPrice * quantity,
              itemDiscount: 0,
              itemTotal: fallbackPrice * quantity
            }
          };
        }
      });

      // 🔥 CRITICAL: Cart totals with precision and validation
      const cartTotals = enrichedItems.reduce((totals, item) => {
        totals.cartSubtotal += item.discountBreakdown.itemSubtotal;
        totals.cartTotalDiscount += item.discountBreakdown.itemDiscount;
        totals.cartTotalAmount += item.discountBreakdown.itemTotal;
        return totals;
      }, { cartSubtotal: 0, cartTotalDiscount: 0, cartTotalAmount: 0 });

      // Final cart totals with rounding and validation
      const subtotal = Math.round(Math.max(0, cartTotals.cartSubtotal) * 100) / 100;
      const totalDiscount = Math.round(Math.max(0, cartTotals.cartTotalDiscount) * 100) / 100;
      const totalAmount = Math.round(Math.max(0, cartTotals.cartTotalAmount) * 100) / 100;

      // 🔥 CRITICAL: Final consistency check
      const calculatedTotal = Math.round((subtotal - totalDiscount) * 100) / 100;
      const finalAmount = Math.abs(totalAmount - calculatedTotal) < 0.01 ? calculatedTotal : totalAmount;

      if (Math.abs(totalAmount - calculatedTotal) > 0.01) {
        Logger.error('Cart total inconsistency detected', {
          totalAmount,
          calculatedTotal,
          subtotal,
          totalDiscount,
          itemCount: enrichedItems.length
        });
      }

      return {
        itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        totalDiscount,
        totalAmount: finalAmount,
        items: enrichedItems,
        appliedCoupon: cart.appliedCoupon
      };
    }, 300); // 5 minutes cache for cart summary
  }
/**
   * Get active flash deals for given products (Flash deals no longer have discounts)
   */
  async getActiveFlashDealsForProducts(productIds) {
    const FlashDealRepository = (await import('../repositories/flashDeal.repository.js')).default;
    const activeFlashDeals = await FlashDealRepository.findActiveDeals();
    
    const flashDealMap = {};
    // Flash deals are now just for display - no discounts
    // Return empty map since flash deals don't provide discounts anymore
    return flashDealMap;
  }

  /**
   * Get active clearance sales for given products
   */
  async getActiveClearanceSalesForProducts(productIds) {
    const ClearanceSaleRepository = (await import('../repositories/clearanceSale.repository.js')).default;
    const activeClearanceSales = await ClearanceSaleRepository.findActiveSales();
    
    const clearanceSaleMap = {};
    activeClearanceSales.forEach(sale => {
      sale.products.forEach(saleProduct => {
        if (productIds.includes(saleProduct.product._id.toString()) && saleProduct.isActive) {
          clearanceSaleMap[saleProduct.product._id.toString()] = saleProduct.discount;
        }
      });
    });
    
    return clearanceSaleMap;
  }
}

export default new CartService();
