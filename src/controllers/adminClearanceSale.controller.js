import ClearanceSaleService from '../services/clearanceSale.service.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants.js';
import catchAsync from '../utils/catchAsync.js';

class AdminClearanceSaleController {
    getConfig = catchAsync(async (req, res) => {
        const config = await ClearanceSaleService.getSaleConfig();
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, config, SUCCESS_MESSAGES.FETCHED)
        );
    });

    upsertConfig = catchAsync(async (req, res) => {
        const config = await ClearanceSaleService.upsertSaleConfig(req.body);
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, config, SUCCESS_MESSAGES.UPDATED)
        );
    });

    toggleStatus = catchAsync(async (req, res) => {
        const { isActive } = req.body;
        const config = await ClearanceSaleService.toggleStatus(isActive);
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, config, 'Clearance sale status updated')
        );
    });

    addProducts = catchAsync(async (req, res) => {
        const { productIds } = req.body;
        const config = await ClearanceSaleService.addProducts(productIds);
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, config, 'Products added to clearance sale')
        );
    });

    removeProduct = catchAsync(async (req, res) => {
        const { productId } = req.params;
        const result = await ClearanceSaleService.removeProduct(productId);
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, result, 'Product removed from clearance sale')
        );
    });

    updateProductDiscount = catchAsync(async (req, res) => {
        const { productId } = req.params;
        const { discount } = req.body;
        const config = await ClearanceSaleService.updateProductDiscount(productId, discount);
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, config, 'Product discount updated in clearance sale')
        );
    });

    toggleProductStatus = catchAsync(async (req, res) => {
        const { productId } = req.params;
        const { isActive } = req.body;
        const config = await ClearanceSaleService.toggleProductStatus(productId, isActive);
        return res.status(HTTP_STATUS.OK).json(
            new ApiResponse(HTTP_STATUS.OK, config, 'Product sale status updated')
        );
    });
}

export default new AdminClearanceSaleController();
