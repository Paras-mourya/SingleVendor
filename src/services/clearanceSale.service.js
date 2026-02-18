import ClearanceSaleRepository from '../repositories/clearanceSale.repository.js';
import ProductRepository from '../repositories/product.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import { uploadImageFromUrl, deleteMultipleImages } from '../utils/imageUpload.util.js';
import Logger from '../utils/logger.js';

class ClearanceSaleService {
    async getSaleConfig() {
        return await MultiLayerCache.get('clearance:config', async () => {
            return await ClearanceSaleRepository.findOne({}, true);
        }, 1800); // 30 minutes cache for config
    }

    async upsertSaleConfig(data) {
        if (data.startDate && data.expireDate) {
            if (new Date(data.expireDate) <= new Date(data.startDate)) {
                throw new AppError('Expire date must be after start date', HTTP_STATUS.BAD_REQUEST);
            }
        }

        let existing = await ClearanceSaleRepository.findOne({});

        // Handle meta image upload
        if (data.metaImage && typeof data.metaImage === 'string' && data.metaImage.startsWith('http')) {
            const upload = await uploadImageFromUrl(data.metaImage, 'clearance-sales/meta');
            if (existing?.metaImage?.publicId) {
                await deleteMultipleImages([existing.metaImage.publicId]);
            }
            data.metaImage = { url: upload.url, publicId: upload.publicId };
        }

        let result;
        if (existing) {
            result = await ClearanceSaleRepository.update(existing._id, data);
        } else {
            result = await ClearanceSaleRepository.create(data);
        }

        await this.invalidateCache();
        return result;
    }

    async toggleStatus(isActive) {
        const existing = await ClearanceSaleRepository.findOne({});
        if (!existing) {
            throw new AppError('Clearance sale configuration not found', HTTP_STATUS.NOT_FOUND);
        }

        const result = await ClearanceSaleRepository.update(existing._id, { isActive });
        await this.invalidateCache();
        return result;
    }

    async addProducts(productIds) {
        const sale = await ClearanceSaleRepository.findOne({});
        if (!sale) {
            throw new AppError('Please setup clearance sale configuration first', HTTP_STATUS.BAD_REQUEST);
        }

        // Verify products exist
        const count = await ProductRepository.count({
            _id: { $in: productIds }
        });

        if (count !== productIds.length) {
            throw new AppError('One or more products do not exist', HTTP_STATUS.BAD_REQUEST);
        }

        const result = await ClearanceSaleRepository.addProducts(productIds);
        await this.invalidateCache();
        return result;
    }

    async removeProduct(productId) {
        const result = await ClearanceSaleRepository.removeProduct(productId);
        await this.invalidateCache();
        return result;
    }

    async updateProductDiscount(productId, discount) {
        const result = await ClearanceSaleRepository.updateProductDiscount(productId, discount);
        if (!result) {
            throw new AppError('Product not found in clearance sale', HTTP_STATUS.NOT_FOUND);
        }
        await this.invalidateCache();
        return result;
    }

    async toggleProductStatus(productId, isActive) {
        const result = await ClearanceSaleRepository.toggleProductStatus(productId, isActive);
        if (!result) {
            throw new AppError('Product not found in clearance sale', HTTP_STATUS.NOT_FOUND);
        }
        await this.invalidateCache();
        return result;
    }

    async invalidateCache() {
        await MultiLayerCache.delByPattern('clearance*');
        await MultiLayerCache.delByPattern('*product*');
        Logger.info('Clearance sale cache invalidated');
    }

    async getActiveSale() {
        return await MultiLayerCache.get('clearance:active', async () => {
            return await ClearanceSaleRepository.findActiveSale();
        }, 600);
    }

    /**
     * Enrich products with clearance sale info and calculate sale price
     */
    async enrichProductsWithSales(products) {
        if (!products) return products;

        const activeSale = await this.getActiveSale();
        if (!activeSale || !activeSale.isActive) return products;

        const isArray = Array.isArray(products);
        const productList = isArray ? products : [products];

        productList.forEach(p => {
            const saleProduct = activeSale.products?.find(sp => sp.product?._id?.toString() === p._id?.toString() || sp.product?.toString() === p._id?.toString());

            if (saleProduct && saleProduct.isActive) {
                // Calculate clearance discount based on type
                let clearanceDiscountPercent = 0;
                if (activeSale.discountType === 'flat') {
                    clearanceDiscountPercent = activeSale.discountAmount;
                } else {
                    clearanceDiscountPercent = saleProduct.discount;
                }

                if (clearanceDiscountPercent > 0) {
                    // 1. Calculate Product Discount Value (handling percent vs flat)
                    let productDiscountAmount = 0;
                    if (p.discount > 0) {
                        if (p.discountType === 'percent') {
                            productDiscountAmount = (p.price * p.discount) / 100;
                        } else {
                            productDiscountAmount = p.discount;
                        }
                    }

                    // 2. Calculate Clearance Discount Value (always percent in this module)
                    const clearanceDiscountAmount = (p.price * clearanceDiscountPercent) / 100;

                    // BEST DEAL LOGIC: Pick the highest monetary discount
                    const bestStoreDiscountAmount = Math.max(productDiscountAmount, clearanceDiscountAmount);
                    const isClearanceBetter = clearanceDiscountAmount > productDiscountAmount;

                    p.clearanceSale = {
                        discount: clearanceDiscountPercent,
                        discountType: 'percent',
                        isApplied: isClearanceBetter,
                        metaTitle: activeSale.metaTitle
                    };

                    // Sale Price logic: Apply the best store discount amount
                    p.salePrice = Math.max(0, p.price - bestStoreDiscountAmount);
                }
            }
        });

        return isArray ? productList : productList[0];
    }
}

export default new ClearanceSaleService();
