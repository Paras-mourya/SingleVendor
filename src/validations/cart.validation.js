import { z } from 'zod';

const addToCart = z.object({
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    variation: z.any().optional(),
  }),
});

const updateCartItem = z.object({
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    variationId: z.string().optional(),
  }),
});

const applyCoupon = z.object({
  body: z.object({
    code: z.string().min(1, 'Coupon code is required').trim().toUpperCase()
  })
});

export default {
  addToCart,
  updateCartItem,
  removeFromCart,
  applyCoupon
};
