import Product from '../models/product.model.js';

class ProductRepository {
    async create(data) {
        return await Product.create(data);
    }

    async findAll(filter = {}, sort = { createdAt: -1 }, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        return await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug')
            .populate('attributes.attribute', 'name')
            .lean();
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
    async findActive(filter = {}, sort = { createdAt: -1 }, page = 1, limit = 12) {
        const query = {
            ...filter,
            status: 'active',
            isActive: true
        };
        const skip = (page - 1) * limit;
        return await Product.find(query)
            .select('name price thumbnail discount discountType status isActive isFeatured quantity unit colors attributes variations')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
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
    async findLowStock(threshold = 10, filter = {}, sort = { quantity: 1 }, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const query = {
            ...filter,
            quantity: { $lte: threshold }
        };
        return await Product.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('category', 'name')
            .lean();
    }

    /**
     * High-performance Text Search
     */
    async searchText(query, page = 1, limit = 12) {
        const skip = (page - 1) * limit;
        const filter = {
            $text: { $search: query },
            status: 'active',
            isActive: true
        };

        return await Product.find(
            filter,
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .select('name price thumbnail discount discountType status isActive isFeatured quantity unit colors searchTags')
            .lean();
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
