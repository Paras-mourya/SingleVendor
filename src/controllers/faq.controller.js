import FAQService from '../services/faq.service.js';
import { HTTP_STATUS } from '../constants.js';
import { ApiResponse } from '../utils/apiResponse.js';

class FAQController {
  createFAQ = async (req, res) => {
    const faq = await FAQService.createFAQ(req.body);
    return ApiResponse.success(res, HTTP_STATUS.CREATED, 'FAQ created successfully', faq);
  };

  getAllFAQs = async (req, res) => {
    const faqs = await FAQService.getAllFAQs();
    return ApiResponse.success(res, HTTP_STATUS.OK, 'FAQs fetched successfully', faqs);
  };

  getFAQById = async (req, res) => {
    const faq = await FAQService.getFAQById(req.params.id);
    return ApiResponse.success(res, HTTP_STATUS.OK, 'FAQ fetched successfully', faq);
  };

  updateFAQ = async (req, res) => {
    const faq = await FAQService.updateFAQ(req.params.id, req.body);
    return ApiResponse.success(res, HTTP_STATUS.OK, 'FAQ updated successfully', faq);
  };

  deleteFAQ = async (req, res) => {
    await FAQService.deleteFAQ(req.params.id);
    return ApiResponse.success(res, HTTP_STATUS.OK, 'FAQ deleted successfully', null);
  };
}

export default new FAQController();
