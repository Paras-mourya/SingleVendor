import Blog from '../models/blog.model.js';
import BaseRepository from './base.repository.js';

class BlogRepository extends BaseRepository {
  constructor() {
    super(Blog);
  }

  async create(data) {
    return await Blog.create(data);
  }

  async findAll(filter = {}, options = {}) {
    const {
      limit = 10,
      sort = { createdAt: -1 },
      populate = 'category',
      cursor = null
    } = options;

    const result = await this.findWithCursor(filter, sort, limit, cursor);

    // Populate after fetching items
    if (populate) {
      await Blog.populate(result.items, { path: populate });
    }

    return {
      blogs: result.items,
      total: await this.count(filter),
      nextCursor: result.nextCursor,
      limit
    };
  }

  async findActiveBlogs(filter = {}, sort = { createdAt: -1 }, limit = 10, cursor = null) {
    const result = await this.findWithCursor({ ...filter, status: 'active' }, sort, limit, cursor);

    // Populate category and ensure it's active
    if (result.items.length > 0) {
      await Blog.populate(result.items, {
        path: 'category',
        match: { status: 'active' }
      });
      // Filter out blogs where category is not active
      result.items = result.items.filter(blog => blog.category);
    }

    return result;
  }

  async findBySlug(slug, populate = 'category') {
    return await Blog.findOne({ slug }).populate(populate);
  }

  async findById(id, populate = 'category') {
    return await Blog.findById(id).populate(populate);
  }

  async updateById(id, updateData) {
    return await Blog.findByIdAndUpdate(id, updateData, { new: true }).populate('category');
  }

  async deleteById(id) {
    return await Blog.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return await Blog.countDocuments(filter);
  }
}

export default new BlogRepository();
