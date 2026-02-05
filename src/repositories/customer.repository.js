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

    async findAll(filter = {}, sort = { createdAt: -1 }, page = 1, limit = 10, selectFields = '') {
        Logger.debug('DB: Finding all customers', { filter, sort, page, limit });
        const skip = (page - 1) * limit;
        const query = Customer.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        if (selectFields) {
            query.select(selectFields);
        }

        return await query.lean();
    }

    async count(filter = {}) {
        Logger.debug('DB: Counting customers', { filter });
        return await Customer.countDocuments(filter);
    }
}

export default new CustomerRepository();
