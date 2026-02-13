/**
 * Base Repository providing common database operations.
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await this.model.create(data);
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
   * Enterprise Standard: Cursor-Based Pagination
   * @param {Object} filter - Mongoose filter
   * @param {Object} sort - Sort config (must include unique field like _id)
   * @param {number} limit - Number of items
   * @param {string} nextCursor - Base64 or string cursor (createdAt_id)
   */
  async findWithCursor(filter = {}, sort = { createdAt: -1 }, limit = 10, nextCursor = null) {
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
      .limit(limit + 1)
      .lean();

    const hasNextPage = items.length > limit;
    const results = hasNextPage ? items.slice(0, limit) : items;

    let newCursor = null;
    if (hasNextPage && results.length > 0) {
      const lastItem = results[results.length - 1];
      newCursor = `${new Date(lastItem.createdAt).getTime()}_${lastItem._id}`;
    }

    return {
      items: results,
      nextCursor: newCursor,
      hasNextPage
    };
  }

  async findById(id) {
    return await this.model.findById(id).lean();
  }

  async findOne(filter) {
    return await this.model.findOne(filter).lean();
  }

  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }
}

export default BaseRepository;
