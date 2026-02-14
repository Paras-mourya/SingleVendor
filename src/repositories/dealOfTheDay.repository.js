import DealOfTheDay from '../models/dealOfTheDay.model.js';
import BaseRepository from './base.repository.js';

class DealOfTheDayRepository extends BaseRepository {
  constructor() {
    super(DealOfTheDay);
  }

  async findAllWithStats(filter = {}, sort = { createdAt: -1 }, limit = 10, cursor = null) {
    const result = await this.findWithCursor(filter, sort, limit, cursor);

    return {
      data: result.items,
      total: await this.count(filter),
      nextCursor: result.nextCursor,
      limit
    };
  }

  async findByIdPopulated(id) {
    return await this.model.findById(id)
      .populate('products.product', 'name price thumbnail discount discountType status isActive')
      .lean();
  }

  async addProducts(dealId, productData) {
    const deal = await this.model.findById(dealId);
    if (!deal) return null;

    productData.forEach(item => {
      const exists = deal.products.find(p => p.product.toString() === item.product.toString());
      if (!exists) {
        deal.products.push(item);
      }
    });

    return await deal.save();
  }

  async removeProduct(dealId, productId) {
    return await this.model.findByIdAndUpdate(
      dealId,
      { $pull: { products: { product: productId } } },
      { new: true }
    ).lean();
  }

  async togglePublish(dealId, isPublished) {
    return await this.model.findByIdAndUpdate(
      dealId,
      { isPublished },
      { new: true }
    ).lean();
  }

  async toggleProductStatus(dealId, productId, isActive) {
    return await this.model.findOneAndUpdate(
      { _id: dealId, 'products.product': productId },
      { $set: { 'products.$.isActive': isActive } },
      { new: true }
    ).lean();
  }
}

export default new DealOfTheDayRepository();
