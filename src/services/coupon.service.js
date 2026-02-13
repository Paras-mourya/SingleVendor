import CouponRepository from '../repositories/coupon.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import Cache from '../utils/cache.js';

class CouponService {
  /**
     * @desc    Create a new coupon
     */
  async createCoupon(data) {
    const existing = await CouponRepository.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new AppError('Coupon code already exists', HTTP_STATUS.BAD_REQUEST);
    }

    const coupon = await CouponRepository.create(data);
    await this.invalidateCache();
    return coupon;
  }

  /**
     * @desc    Get all coupons with pagination
     */
  async getAllCoupons(query) {
    const { limit = 10, cursor = null, search, type, isActive } = query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const result = await CouponRepository.findAll(filter, { createdAt: -1 }, parseInt(limit), cursor);

    return {
      coupons: result.coupons,
      total: result.total,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };
  }

  /**
     * @desc    Get coupon by ID
     */
  async getCouponById(id) {
    const coupon = await CouponRepository.findById(id);
    if (!coupon) {
      throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);
    }
    return coupon;
  }

  /**
     * @desc    Update coupon
     */
  async updateCoupon(id, data) {
    if (data.code) {
      const existing = await CouponRepository.findOne({
        code: data.code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existing) {
        throw new AppError('Coupon code already exists', HTTP_STATUS.BAD_REQUEST);
      }
    }

    const coupon = await CouponRepository.update(id, data);
    if (!coupon) {
      throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);
    }
    await this.invalidateCache();
    return coupon;
  }

  /**
     * @desc    Delete coupon
     */
  async deleteCoupon(id) {
    const coupon = await CouponRepository.delete(id);
    if (!coupon) {
      throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);
    }
    await this.invalidateCache();
    return coupon;
  }

  /**
     * @desc    Toggle coupon status
     */
  async toggleStatus(id, isActive) {
    const coupon = await CouponRepository.update(id, { isActive });
    if (!coupon) {
      throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);
    }
    await this.invalidateCache();
    return coupon;
  }

  /**
     * @desc    Validate a coupon code for a user/order
     */
  async validateCoupon(code, userId, orderAmount) {
    const coupon = await CouponRepository.findActiveByCode(code);

    if (!coupon) {
      throw new AppError('Invalid or expired coupon code', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. Min Purchase Check
    if (orderAmount < coupon.minPurchase) {
      throw new AppError(`Minimum purchase of ${coupon.minPurchase} required for this coupon`, HTTP_STATUS.BAD_REQUEST);
    }

    // 2. User Limit Check (Simulated for now, would normally check Order history)
    // Note: In a real system, you'd check how many times this userId has used this coupon code in successful orders.
    // For this task, we will just return the valid coupon object.

    return coupon;
  }

  /**
     * @desc    Calculate discount based on coupon
     */
  calculateDiscount(coupon, orderAmount) {
    if (coupon.type === 'free_delivery') return 0; // Handled separately in shipping logic

    if (coupon.discountType === 'percent') {
      return (orderAmount * coupon.discountAmount) / 100;
    }
    return coupon.discountAmount;
  }

  async invalidateCache() {
    await Cache.delByPattern('*coupon*');
  }
}

export default new CouponService();
