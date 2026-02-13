import NewsletterService from '../services/newsletter.service.js';
import { HTTP_STATUS } from '../constants.js';
import { ApiResponse } from '../utils/apiResponse.js';

class NewsletterController {
  /**
   * @desc    Subscribe to newsletter
   * @route   POST /api/v1/newsletter/subscribe
   * @access  Public
   */
  subscribe = async (req, res) => {
    const { email } = req.body;
    const subscription = await NewsletterService.subscribe(email);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, subscription, 'Thank you for subscribing to our newsletter!')
    );
  };

  /**
   * @desc    Get all subscribers with filtering/sorting
   * @route   GET /api/v1/newsletter/admin/subscribers
   * @access  Private (Admin)
   */
  getSubscribers = async (req, res) => {
    const {
      search,
      startDate,
      endDate,
      sortBy,
      limit = 10,
      cursor = null
    } = req.query;

    const queryOptions = {
      search,
      startDate,
      endDate,
      sortBy,
      limit: parseInt(limit),
      cursor
    };

    const result = await NewsletterService.getSubscribers(queryOptions);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, result, 'Subscribers fetched successfully')
    );
  };
}

export default new NewsletterController();
