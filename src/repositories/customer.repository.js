import Customer from '../models/customer.model.js';
import Logger from '../utils/logger.js';

class CustomerRepository {
  async create(customerData, options = {}) {
    Logger.debug('DB: Creating customer(s)', { customerData });
    const docs = await Customer.create(Array.isArray(customerData) ? customerData : [customerData], options);
    return Array.isArray(customerData) ? docs : docs[0];
  }

  async findByEmail(email, selectFields = '', lean = false) {
    Logger.debug(`DB: Finding customer by email: ${email}`);
    const query = Customer.findOne({ email });
    if (selectFields) {
      query.select(selectFields);
    }
    if (lean) {
      query.lean();
    }
    return await query;
  }

  async findById(id, selectFields = '', lean = false) {
    Logger.debug(`DB: Finding customer by ID: ${id}`);
    const query = Customer.findById(id);
    if (selectFields) {
      query.select(selectFields);
    }
    if (lean) {
      query.lean();
    }
    return await query;
  }

  async updateById(id, updateData, options = { new: true }) {
    Logger.debug(`DB: Updating customer by ID: ${id}`, { updateData });
    return await Customer.findByIdAndUpdate(id, updateData, options);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }, limit = 10, nextCursor = null, selectFields = '') {
    Logger.debug('DB: Finding all customers', { filter, sort, limit, nextCursor });

    const query = { ...filter };
    if (nextCursor) {
      const [cursorTime, cursorId] = nextCursor.split('_');
      query.$or = [
        { createdAt: { $lt: new Date(Number(cursorTime)) } },
        {
          createdAt: new Date(Number(cursorTime)),
          _id: { $lt: cursorId }
        }
      ];
    }

    const docQuery = Customer.find(query)
      .sort(sort)
      .limit(limit + 1);

    if (selectFields) {
      docQuery.select(selectFields);
    }

    const customers = await docQuery.lean();

    const hasNextPage = customers.length > limit;
    const items = hasNextPage ? customers.slice(0, limit) : customers;

    let lastItem = items[items.length - 1];
    let newCursor = hasNextPage ? `${new Date(lastItem.createdAt).getTime()}_${lastItem._id}` : null;

    return {
      items,
      nextCursor: newCursor,
      hasNextPage
    };
  }

  async count(filter = {}) {
    Logger.debug('DB: Counting customers', { filter });
    return await Customer.countDocuments(filter);
  }

  /**
   * BULK OPERATIONS
   */

  async bulkCreate(customers) {
    Logger.debug('DB: Bulk creating customers', { count: customers.length });
    return await Customer.insertMany(customers, { ordered: false });
  }

  async bulkUpdateStatus(ids, status) {
    Logger.debug('DB: Bulk updating customer status', { count: ids.length, status });
    return await Customer.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          status, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async bulkDelete(ids) {
    Logger.debug('DB: Bulk deleting customers', { count: ids.length });
    return await Customer.deleteMany({ _id: { $in: ids } });
  }

  async bulkUpdateTier(ids, tier) {
    Logger.debug('DB: Bulk updating customer tier', { count: ids.length, tier });
    return await Customer.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          tier, 
          updatedAt: new Date() 
        } 
      }
    );
  }
}

export default new CustomerRepository();
