import ProductAttributeService from '../services/productAttribute.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants.js';

class ProductAttributeController {
    createAttribute = async (req, res) => {
        const attribute = await ProductAttributeService.createAttribute(req.body);
        return res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, attribute, SUCCESS_MESSAGES.CREATED));
    };

    getAllAttributes = async (req, res) => {
        const attributes = await ProductAttributeService.getAllAttributes(req.query);
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, attributes, SUCCESS_MESSAGES.FETCHED));
    };

    getPublicAttributes = async (req, res) => {
        const attributes = await ProductAttributeService.getPublicAttributes();
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, attributes, SUCCESS_MESSAGES.FETCHED));
    };

    getAttributeById = async (req, res) => {
        const attribute = await ProductAttributeService.getAttributeById(req.params.id);
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, attribute, SUCCESS_MESSAGES.FETCHED));
    };

    updateAttribute = async (req, res) => {
        const attribute = await ProductAttributeService.updateAttribute(req.params.id, req.body);
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, attribute, SUCCESS_MESSAGES.UPDATED));
    };

    deleteAttribute = async (req, res) => {
        await ProductAttributeService.deleteAttribute(req.params.id);
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.DELETED));
    };
}

export default new ProductAttributeController();
