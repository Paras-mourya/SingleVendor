import DealOfTheDayRepository from '../repositories/dealOfTheDay.repository.js';
import ProductRepository from '../repositories/product.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';

class DealOfTheDayService {
    async createDeal(data) {
        return await DealOfTheDayRepository.create(data);
    }

    async getAllDeals(query = {}) {
        const { limit = 10, cursor = null } = query;
        const filter = {};
        if (query.title) filter.title = { $regex: query.title, $options: 'i' };
        if (query.isPublished !== undefined) filter.isPublished = query.isPublished === 'true';

        return await DealOfTheDayRepository.findAllWithStats(filter, { createdAt: -1 }, parseInt(limit), cursor);
    }

    async getDealById(id) {
        const deal = await DealOfTheDayRepository.findByIdPopulated(id);
        if (!deal) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND);
        return deal;
    }

    async updateDeal(id, data) {
        const result = await DealOfTheDayRepository.updateById(id, data);
        if (!result) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND);
        return result;
    }

    async deleteDeal(id) {
        const result = await DealOfTheDayRepository.deleteById(id);
        if (!result) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND);
        return result;
    }

    async togglePublishStatus(id, isPublished) {
        return await DealOfTheDayRepository.togglePublish(id, isPublished);
    }

    async addProductsToDeal(id, products) {
        return await DealOfTheDayRepository.addProducts(id, products);
    }

    async removeProductFromDeal(id, productId) {
        return await DealOfTheDayRepository.removeProduct(id, productId);
    }

    async toggleProductStatus(id, productId, isActive) {
        return await DealOfTheDayRepository.toggleProductStatus(id, productId, isActive);
    }

    async getActiveDeals(limit = 10) {
        const now = new Date();
        const result = await DealOfTheDayRepository.findAllWithStats({
            isPublished: true
        }, { createdAt: -1 }, limit);
        return result.data;
    }

    async getPublicDealById(id) {
        const deal = await DealOfTheDayRepository.findByIdPopulated(id);
        if (!deal || !deal.isPublished) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND);
        return deal;
    }
}

export default new DealOfTheDayService();
