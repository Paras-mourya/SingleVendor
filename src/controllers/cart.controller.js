import CartService from '../services/cart.service.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import Logger from '../utils/logger.js';

/**
 * Helper to get user/guest identifier from request
 */
const getIds = (req) => {
  return {
    userId: req.user?._id || req.customer?._id || null,
    guestId: req.headers['x-guest-id'] || req.cookies?.guestId || null
  };
};

export const getCart = async (req, res) => {
  const { userId, guestId } = getIds(req);

  if (!userId && !guestId) {
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { items: [], totalPrice: 0 }, 'Empty Cart'));
  }

  const cart = await CartService.getCart({ userId, guestId });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, cart, 'Cart fetched successfully'));
};

export const addToCart = async (req, res) => {
  const { userId, guestId } = getIds(req);
  const { productId, quantity, variation } = req.body;

  if (!userId && !guestId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(new ApiResponse(HTTP_STATUS.BAD_REQUEST, null, 'User or Guest ID required'));
  }

  const cart = await CartService.addToCart({ userId, guestId, productId, quantity, variation });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, cart, 'Item added to cart'));
};

export const updateCartItem = async (req, res) => {
  const { userId, guestId } = getIds(req);
  const { productId, quantity, variationId } = req.body;

  const cart = await CartService.updateCartItem({ userId, guestId, productId, quantity, variationId });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, cart, 'Cart updated'));
};

export const removeFromCart = async (req, res) => {
  const { userId, guestId } = getIds(req);
  const { productId, variationId } = req.body;

  const cart = await CartService.removeFromCart({ userId, guestId, productId, variationId });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, cart, 'Item removed from cart'));
};

export const clearCart = async (req, res) => {
  const { userId, guestId } = getIds(req);
  await CartService.clearCart({ userId, guestId });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, 'Cart cleared'));
};

export const applyCoupon = async (req, res) => {
  const { userId, guestId } = getIds(req);
  const { code } = req.body;

  const cart = await CartService.applyCoupon({ userId, guestId, code });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, cart, 'Coupon applied successfully'));
};

export const removeCoupon = async (req, res) => {
  const { userId, guestId } = getIds(req);

  const cart = await CartService.removeCoupon({ userId, guestId });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, cart, 'Coupon removed successfully'));
};

export const getCartSummary = async (req, res) => {
  const { userId, guestId } = getIds(req);

  if (!userId && !guestId) {
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { items: [], grandTotal: 0 }, 'Empty Summary'));
  }

  const summary = await CartService.getCartSummary({ userId, guestId });
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, summary, 'Cart summary fetched successfully'));
};

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  applyCoupon,
  removeCoupon
};
