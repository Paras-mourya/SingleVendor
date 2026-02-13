import Product from '../models/product.model.js';

class ProductRepository {
  async create(data) {
    return await Product.create(data);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }, limit = 10, nextCursor = null) {
    const query = { ...filter };

    // Cursor Pagination Logic
    if (nextCursor) {
      const [cursorDate, cursorId] = nextCursor.split('_');
      // For descending createdAt sort
      query.$or = [
        { createdAt: { $lt: new Date(Number(cursorDate)) } },
        {
          createdAt: new Date(Number(cursorDate)),
          _id: { $lt: cursorId }
        }
      ];
    }

    const products = await Product.find(query)
      .sort(sort)
      .limit(limit + 1) // Fetch one extra to check if there's a next page
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('attributes.attribute', 'name')
      .lean();

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;

    let lastItem = items[items.length - 1];
    let newCursor = hasNextPage ? `${new Date(lastItem.createdAt).getTime()}_${lastItem._id}` : null;

    return {
      items,
      nextCursor: newCursor,
      hasNextPage
    };
  }

  async findById(id) {
    return await Product.findById(id)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('attributes.attribute', 'name')
      .lean();
  }

  async findOne(filter) {
    return await Product.findOne(filter).lean();
  }

  async update(id, data) {
    return await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  }

  async delete(id) {
    return await Product.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await Product.countDocuments(filter);
  }

  /**
     * Optimized find for Public Homepage (Active only)
     */
  async findActive(filter = {}, sort = { createdAt: -1 }, limit = 12, nextCursor = null) {
    const query = {
      ...filter,
      status: 'active',
      isActive: true
    };

    if (nextCursor) {
      const [cursorDate, cursorId] = nextCursor.split('_');
      query.$or = [
        { createdAt: { $lt: new Date(Number(cursorDate)) } },
        {
          createdAt: new Date(Number(cursorDate)),
          _id: { $lt: cursorId }
        }
      ];
    }

    const products = await Product.find(query)
      .select('name price thumbnail discount discountType status isActive isFeatured quantity unit colors attributes variations createdAt')
      .sort(sort)
      .limit(limit + 1)
      .lean();

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;

    let lastItem = items[items.length - 1];
    let newCursor = hasNextPage ? `${new Date(lastItem.createdAt).getTime()}_${lastItem._id}` : null;

    return {
      items,
      nextCursor: newCursor,
      hasNextPage
    };
  }

  /**
     * Atomic Stock Update (Prevents race conditions)
     */
  async incrementStock(id, amount) {
    return await Product.findByIdAndUpdate(
      id,
      { $inc: { quantity: amount } },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
     * Find products with stock below threshold
     */
  async findLowStock(threshold = 10, filter = {}, sort = { quantity: 1 }, limit = 10, nextCursor = null) {
    const query = {
      ...filter,
      quantity: { $lte: threshold }
    };

    if (nextCursor) {
      const [cursorVal, cursorId] = nextCursor.split('_');
      // Numeric quantity sort
      query.$or = [
        { quantity: { $gt: Number(cursorVal) } }, // Default asc, but if quantity is same use _id
        {
          quantity: Number(cursorVal),
          _id: { $gt: cursorId }
        }
      ];
    }

    const products = await Product.find(query)
      .sort(sort)
      .limit(limit + 1)
      .populate('category', 'name')
      .lean();

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;

    let lastItem = items[items.length - 1];
    let newCursor = hasNextPage ? `${lastItem.quantity}_${lastItem._id}` : null;

    return {
      items,
      nextCursor: newCursor,
      hasNextPage
    };
  }

  /**
     * High-performance Text Search
     */
  async searchText(query, limit = 12, nextCursor = null) {
    const filter = {
      $text: { $search: query },
      status: 'active',
      isActive: true
    };

    if (nextCursor) {
      const [cursorScore, cursorId] = nextCursor.split('_');
      // Hybrid filter for text search (stable cursor)
      filter.$or = [
        { score: { $lt: Number(cursorScore) } },
        {
          score: Number(cursorScore),
          _id: { $lt: cursorId }
        }
      ];
    }

    // Note: When using $text score with extra filters, Mongoose needs special handling
    // or we might need to use aggregations for true stable cursor on scores.
    // For now, simple $text + score + _id is implemented.

    const products = await Product.find(
      filter,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, _id: -1 })
      .limit(limit + 1)
      .select('name price thumbnail discount discountType status isActive isFeatured quantity unit colors searchTags createdAt')
      .lean();

    // Since text search scores are floating points, skip/limit is sometimes still 
    // used in elasticsearch-like layers. But here we mimic the cursor pattern.

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;

    let lastItem = items[items.length - 1];
    let newCursor = hasNextPage ? `${lastItem.score}_${lastItem._id}` : null;

    return {
      items,
      nextCursor: newCursor,
      hasNextPage
    };
  }

  /**
     * Find similar products based on search tags
     */
  async findSimilarByTags(tags, excludeId, limit = 4) {
    if (!tags || tags.length === 0) return [];

    return await Product.find({
      _id: { $ne: excludeId },
      searchTags: { $in: tags },
      status: 'active',
      isActive: true
    })
      .select('name price thumbnail discount discountType status isActive isFeatured quantity unit colors')
      .limit(limit)
      .lean();
  }
}

export default new ProductRepository();
