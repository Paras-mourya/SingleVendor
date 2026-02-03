import ProductAttributeRepository from '../repositories/productAttribute.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import Cache from '../utils/cache.js';

const ATTRIBUTE_CACHE_KEY = 'product_attributes';

class ProductAttributeService {
    async createAttribute(data) {
        // Check for duplicate name
        const existing = await ProductAttributeRepository.findOne({ name: data.name });
        if (existing) {
            throw new AppError('Attribute with this name already exists', HTTP_STATUS.CONFLICT, 'DUPLICATE_ATTRIBUTE');
        }

        // Auto-generate slug if not present (Model handles implies, but good to ensure uniqueness explicitly if needed)
        // Model pre-save handles slug generation usually.

        const attribute = await ProductAttributeRepository.create(data);
        await this.invalidateCache();
        return attribute;
    }

    async getAllAttributes(query) {
        // Simple caching for list without heavy filters
        const cacheKey = `${ATTRIBUTE_CACHE_KEY}:list`;
        const cached = await Cache.get(cacheKey);
        if (cached) return cached;

        const attributes = await ProductAttributeRepository.findAll({}, { name: 1 }); // Sort by name
        await Cache.set(cacheKey, attributes, 3600); // 1 hour
        return attributes;
    }

    async getPublicAttributes() {
        const cacheKey = `${ATTRIBUTE_CACHE_KEY}:public`;
        const cached = await Cache.get(cacheKey);
        if (cached) return cached;

        const attributes = await ProductAttributeRepository.findAll({ isActive: true }, { name: 1 });
        await Cache.set(cacheKey, attributes, 3600);
        return attributes;
    }

    async getAttributeById(id) {
        const attribute = await ProductAttributeRepository.findById(id);
        if (!attribute) {
            throw new AppError('Attribute not found', HTTP_STATUS.NOT_FOUND, 'ATTRIBUTE_NOT_FOUND');
        }
        return attribute;
    }

    async updateAttribute(id, data) {
        const attribute = await ProductAttributeRepository.findById(id);
        if (!attribute) {
            throw new AppError('Attribute not found', HTTP_STATUS.NOT_FOUND, 'ATTRIBUTE_NOT_FOUND');
        }

        const updated = await ProductAttributeRepository.update(id, data);
        await this.invalidateCache();
        return updated;
    }

    async deleteAttribute(id) {
        const attribute = await ProductAttributeRepository.findById(id);
        if (!attribute) {
            throw new AppError('Attribute not found', HTTP_STATUS.NOT_FOUND, 'ATTRIBUTE_NOT_FOUND');
        }

        await ProductAttributeRepository.delete(id);
        await this.invalidateCache();
        return true;
    }

    async invalidateCache() {
        await Cache.delByPattern(`${ATTRIBUTE_CACHE_KEY}*`);
        await Cache.delByPattern('response:/api/v1/product-attributes*');
        // If an attribute changes, products that use them might need a refresh
        await Cache.delByPattern('*product*');
    }
}

export default new ProductAttributeService();
