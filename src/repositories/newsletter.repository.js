import Newsletter from '../models/newsletter.model.js';
import BaseRepository from './base.repository.js';

class NewsletterRepository extends BaseRepository {
  constructor() {
    super(Newsletter);
  }

  async subscribe(email) {
    return await this.model.findOneAndUpdate(
      { email },
      { status: 'subscribed' },
      { upsert: true, new: true }
    ).lean();
  }

  async unsubscribe(email) {
    return await this.model.findOneAndUpdate(
      { email },
      { status: 'unsubscribed' },
      { new: true }
    ).lean();
  }

  async findByEmail(email) {
    return await this.model.findOne({ email }).lean();
  }

  async findAll(options = {}) {
    const {
      search,
      startDate,
      endDate,
      sortBy = 'newestFirst',
      limit = 10,
      cursor = null
    } = options;

    const query = {};

    // 1. Email Search (Regex)
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    // 2. Date Range Filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 3. Sorting (Mapping sortBy to Mongoose sort object)
    let sort = { createdAt: -1 };
    switch (sortBy) {
      case 'oldestFirst': sort = { createdAt: 1 }; break;
      case 'emailAZ': sort = { email: 1 }; break;
      case 'emailZA': sort = { email: -1 }; break;
      default: sort = { createdAt: -1 };
    }

    const result = await this.findWithCursor(query, sort, limit, cursor);

    return {
      subscribers: result.items,
      total: await this.count(query),
      nextCursor: result.nextCursor
    };
  }
}

export default new NewsletterRepository();
