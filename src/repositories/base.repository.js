/**
 * Base Repository providing common database operations with Multi-Layer Caching
 */
import MultiLayerCache from '../utils/multiLayerCache.js';

class BaseRepository {
  constructor(model) {
    this.model = model;
    this.cachePrefix = `${model.modelName.toLowerCase()}:`;
  }

  async create(data) {
    const result = await this.model.create(data);
    
    // Invalidate list caches on create
    await MultiLayerCache.delByPattern(`${this.cachePrefix}list:*`);
    
    return result;
  }

  async find(filter = {}, sort = { createdAt: -1 }, page = 1, limit = 10) {
    // Legacy support (Deprecated)
    const skip = (page - 1) * limit;
    return await this.model.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Enterprise Standard: Cursor-Based Pagination with Caching
   * @param {Object} filter - Mongoose filter
   * @param {Object} sort - Sort config (must include unique field like _id)
   * @param {number} limit - Number of items
   * @param {string} nextCursor - Base64 or string cursor (createdAt_id)
   */
  async findWithCursor(filter = {}, sort = { createdAt: -1 }, limit = 10, nextCursor = null) {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify({ filter, sort, limit, nextCursor })}`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      const query = { ...filter };

      if (nextCursor) {
        const [cursorTime, cursorId] = nextCursor.split('_');
        // Hybrid logic for descending sort
        query.$or = [
          { createdAt: { $lt: new Date(Number(cursorTime)) } },
          {
            createdAt: new Date(Number(cursorTime)),
            _id: { $lt: cursorId }
          }
        ];
      }

      const items = await this.model.find(query)
        .sort(sort)
        .limit(limit + 1) // Fetch one extra to check if there's a next page
        .lean();

      const hasNextPage = items.length > limit;
      const resultItems = hasNextPage ? items.slice(0, limit) : items;

      let lastItem = resultItems[resultItems.length - 1];
      let newCursor = hasNextPage ? `${new Date(lastItem.createdAt).getTime()}_${lastItem._id}` : null;

      return {
        items: resultItems,
        nextCursor: newCursor,
        hasNextPage
      };
    }, 900); // 15 minutes cache for list data
  }

  async findById(id) {
    const cacheKey = `${this.cachePrefix}${id}`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      return await this.model.findById(id).lean();
    }, 1800); // 30 minutes cache for individual items
  }

  async findOne(filter) {
    const cacheKey = `${this.cachePrefix}findOne:${JSON.stringify(filter)}`;
    
    return await MultiLayerCache.get(cacheKey, async () => {
      return await this.model.findOne(filter).lean();
    }, 900); // 15 minutes cache for findOne queries
  }

  async update(id, data) {
    // Get existing item for cache invalidation
    const existingItem = await this.model.findById(id);
    
    const result = await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    
    // Invalidate caches
    await MultiLayerCache.del(`${this.cachePrefix}${id}`);
    await MultiLayerCache.delByPattern(`${this.cachePrefix}list:*`);
    await MultiLayerCache.delByPattern(`${this.cachePrefix}findOne:*`);
    
    return result;
  }

  async delete(id) {
    const result = await this.model.findByIdAndDelete(id);
    
    // Invalidate caches
    await MultiLayerCache.del(`${this.cachePrefix}${id}`);
    await MultiLayerCache.delByPattern(`${this.cachePrefix}list:*`);
    await MultiLayerCache.delByPattern(`${this.cachePrefix}findOne:*`);
    
    return result;
  }

  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }
}

export default BaseRepository;
