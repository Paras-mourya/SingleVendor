import ClearanceSale from '../models/clearanceSale.model.js';
import BaseRepository from './base.repository.js';

class ClearanceSaleRepository extends BaseRepository {
    constructor() {
        super(ClearanceSale);
    }

    async findActiveSale() {
        const now = new Date();
        return await this.model.findOne({
            isActive: true,
            startDate: { $lte: now },
            expireDate: { $gte: now }
        })
            .populate('products.product', 'name thumbnail price status isActive')
            .lean();
    }

    async addProducts(productIds) {
        const sale = await this.model.findOne();
        if (!sale) return null;

        productIds.forEach(id => {
            const exists = sale.products.find(p => p.product.toString() === id.toString());
            if (!exists) {
                sale.products.push({ product: id, isActive: true, discount: 0 });
            }
        });

        return await sale.save();
    }

    async removeProduct(productId) {
        return await this.model.findOneAndUpdate(
            {},
            { $pull: { products: { product: productId } } },
            { new: true }
        );
    }

    async updateProductDiscount(productId, discount) {
        return await this.model.findOneAndUpdate(
            { 'products.product': productId },
            { $set: { 'products.$.discount': discount } },
            { new: true }
        );
    }

    async toggleProductStatus(productId, isActive) {
        return await this.model.findOneAndUpdate(
            { 'products.product': productId },
            { $set: { 'products.$.isActive': isActive } },
            { new: true }
        );
    }
}

export default new ClearanceSaleRepository();
