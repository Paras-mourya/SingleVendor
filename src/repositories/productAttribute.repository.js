import ProductAttribute from '../models/productAttribute.model.js';
import BaseRepository from './base.repository.js';

class ProductAttributeRepository extends BaseRepository {
  constructor() {
    super(ProductAttribute);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }, limit = 100, cursor = null) {
    const result = await this.findWithCursor(filter, sort, limit, cursor);
    return {
      attributes: result.items,
      total: await this.count(filter),
      nextCursor: result.nextCursor
    };
  }

  async findOne(filter) {
    return await this.model.findOne(filter).lean();
  }

  async update(id, data) {
    return await this.updateById(id, data);
  }

  async delete(id) {
    return await this.deleteById(id);
  }
}

export default new ProductAttributeRepository();
