import Coupon from '../models/coupon.model.js';
import BaseRepository from './base.repository.js';

class CouponRepository extends BaseRepository {
  constructor() {
    super(Coupon);
  }

  async create(data) {
    return await Coupon.create(data);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }, limit = 10, cursor = null) {
    const result = await this.findWithCursor(filter, sort, limit, cursor);
    return {
      coupons: result.items,
      total: await this.count(filter),
      nextCursor: result.nextCursor,
      limit
    };
  }

  async findById(id) {
    return await Coupon.findById(id).lean();
  }

  async findOne(filter) {
    return await Coupon.findOne(filter).lean();
  }

  /**
     * @desc    Find an active coupon by its code
     */
  async findActiveByCode(code) {
    const now = new Date();
    return await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: now },
      expireDate: { $gte: now }
    }).lean();
  }

  async update(id, data) {
    return await Coupon.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  }

  async delete(id) {
    return await Coupon.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await Coupon.countDocuments(filter);
  }

  /**
     * @desc    Atomically increment usage count
     */
  async incrementUsage(id) {
    return await Coupon.findByIdAndUpdate(
      id,
      { $inc: { totalUsed: 1 } },
      { new: true }
    ).lean();
  }

  /**
   * BULK OPERATIONS
   */

  async bulkCreate(coupons) {
    return await Coupon.insertMany(coupons, { ordered: false });
  }

  async bulkUpdateStatus(ids, isActive) {
    return await Coupon.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          isActive, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async bulkDelete(ids) {
    return await Coupon.deleteMany({ _id: { $in: ids } });
  }

  async bulkExpire(ids) {
    return await Coupon.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          expireDate: new Date(), 
          updatedAt: new Date() 
        } 
      }
    );
  }
}

export default new CouponRepository();
