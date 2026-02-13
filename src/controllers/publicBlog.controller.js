import BlogService from '../services/blog.service.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants.js';
import { ApiResponse } from '../utils/apiResponse.js';

class PublicBlogController {
  getBlogs = async (req, res) => {
    const result = await BlogService.getPublicBlogs(req.query);
    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, result, SUCCESS_MESSAGES.FETCHED)
    );
  };

  getBlogBySlug = async (req, res) => {
    const blog = await BlogService.getPublicBlogBySlug(req.params.slug);
    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, blog, SUCCESS_MESSAGES.FETCHED)
    );
  };

  getSettings = async (req, res) => {
    const settings = await BlogService.getSettings();
    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, settings, SUCCESS_MESSAGES.FETCHED)
    );
  };
}

export default new PublicBlogController();
