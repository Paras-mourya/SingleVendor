import express from 'express';
import { optionalProtect } from '../middleware/optionalAuth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import CartValidation from '../validations/cart.validation.js';
import CartController from '../controllers/cart.controller.js';
import lockRequest from '../middleware/idempotency.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = express.Router();

// All cart routes use optionalProtect to identify if user is logged in
router.use(optionalProtect);

// Cache cart GET requests for better performance
router.get('/', 
  cacheMiddleware({
    ttl: 300, // 5 minutes cache for cart data
    keyGenerator: (req) => {
      const userId = req.user?.id || 'guest';
      const guestId = req.guestId || 'anonymous';
      return `cart:${userId}:${guestId}`;
    }
  }),
  CartController.getCart
);

router.post(
  '/add',
  lockRequest(),
  validate(CartValidation.addToCart),
  cacheMiddleware({ invalidatePattern: 'cart:*', type: 'invalidate' }),
  CartController.addToCart
);

router.patch(
  '/update',
  lockRequest(),
  validate(CartValidation.updateCartItem),
  cacheMiddleware({ invalidatePattern: 'cart:*', type: 'invalidate' }),
  CartController.updateCartItem
);

router.delete(
  '/remove',
  lockRequest(),
  validate(CartValidation.removeFromCart),
  cacheMiddleware({ invalidatePattern: 'cart:*', type: 'invalidate' }),
  CartController.removeFromCart
);

router.delete('/clear', 
  cacheMiddleware({ invalidatePattern: 'cart:*', type: 'invalidate' }),
  CartController.clearCart
);

export default router;
