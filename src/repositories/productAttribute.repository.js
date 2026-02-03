import ProductAttribute from '../models/productAttribute.model.js';

class ProductAttributeRepository {
    async create(data) {
        return await ProductAttribute.create(data);
    }

    async findAll(filter = {}, sort = { createdAt: -1 }, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        return await ProductAttribute.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
    }

    async findById(id) {
        return await ProductAttribute.findById(id).lean();
    }

    async findOne(filter) {
        return await ProductAttribute.findOne(filter).lean();
    }

    async update(id, data) {
        return await ProductAttribute.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        }).lean();
    }

    async delete(id) {
        return await ProductAttribute.findByIdAndDelete(id);
    }

    async count(filter = {}) {
        return await ProductAttribute.countDocuments(filter);
    }
}

export default new ProductAttributeRepository();
