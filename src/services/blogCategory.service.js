import BlogCategoryRepository from '../repositories/blogCategory.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';

const BLOG_CATEGORY_CACHE_KEY = 'blog:categories:all';
const BLOG_CATEGORY_RESPONSE_PATTERN = 'response:/api/v1/blog-categories*';

class BlogCategoryService {
  async invalidateCache() {
    await MultiLayerCache.del(BLOG_CATEGORY_CACHE_KEY);
    await MultiLayerCache.delByPattern(BLOG_CATEGORY_RESPONSE_PATTERN);
    Logger.debug('Blog Category Cache Invalidated');
  }

  async createCategory(data) {
    const existing = await BlogCategoryRepository.findByName(data.name);
    if (existing) {
      throw new AppError('Blog category already exists', HTTP_STATUS.BAD_REQUEST, 'BLOG_CATEGORY_EXISTS');
    }

    const category = await BlogCategoryRepository.create(data);
    await this.invalidateCache();
    return category;
  }

  async getAllCategories(filter = {}) {
    // Try data cache first if no filters are applied
    if (Object.keys(filter).length === 0) {
      const cached = await MultiLayerCache.get(BLOG_CATEGORY_CACHE_KEY);
      if (cached) {
        Logger.debug('Blog Categories Data Cache Hit');
        return cached;
      }
    }

    const categories = await BlogCategoryRepository.findAll(filter);
    
    // Cache the full list
    if (Object.keys(filter).length === 0) {
      await MultiLayerCache.set(BLOG_CATEGORY_CACHE_KEY, categories, 3600);
    }
    
    return categories;
  }

  async getCategoryById(id) {
    const category = await BlogCategoryRepository.findById(id);
    if (!category) {
      throw new AppError('Blog category not found', HTTP_STATUS.NOT_FOUND, 'BLOG_CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async updateCategory(id, updateData) {
    const category = await BlogCategoryRepository.findById(id);
    if (!category) {
      throw new AppError('Blog category not found', HTTP_STATUS.NOT_FOUND, 'BLOG_CATEGORY_NOT_FOUND');
    }

    if (updateData.name) {
      const existing = await BlogCategoryRepository.findByName(updateData.name);
      if (existing && existing._id.toString() !== id) {
        throw new AppError('Blog category name already exists', HTTP_STATUS.BAD_REQUEST, 'BLOG_CATEGORY_EXISTS');
      }
    }

    const updated = await BlogCategoryRepository.updateById(id, updateData);
    await this.invalidateCache();
    return updated;
  }

  async deleteCategory(id) {
    const category = await BlogCategoryRepository.findById(id);
    if (!category) {
      throw new AppError('Blog category not found', HTTP_STATUS.NOT_FOUND, 'BLOG_CATEGORY_NOT_FOUND');
    }

    // TODO: Link with BlogRepository to check if any blogs are using this category
    // For now, simple delete
    await BlogCategoryRepository.deleteById(id);
    await this.invalidateCache();
    return true;
  }

  async toggleStatus(id) {
    const category = await BlogCategoryRepository.findById(id);
    if (!category) {
      throw new AppError('Blog category not found', HTTP_STATUS.NOT_FOUND, 'BLOG_CATEGORY_NOT_FOUND');
    }

    const newStatus = category.status === 'active' ? 'inactive' : 'active';
    const updated = await BlogCategoryRepository.updateById(id, { status: newStatus });
    await this.invalidateCache();
    return updated;
  }
}

export default new BlogCategoryService();
