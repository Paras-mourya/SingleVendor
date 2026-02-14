import Employee from '../models/employee.model.js';
import BaseRepository from './base.repository.js';

class EmployeeRepository extends BaseRepository {
  constructor() {
    super(Employee);
  }
  async create(employeeData) {
    return await Employee.create(employeeData);
  }

  async findByEmail(email, selectPassword = false) {
    const query = Employee.findOne({ email }).populate('role', 'name permissions isActive');
    if (selectPassword) {
      query.select('+password');
    }
    return await query.lean();
  }

  async findById(id) {
    return await Employee.findById(id)
      .populate('role', 'name permissions isActive')
      .lean();
  }

  async findAll(query = {}, limit = 10, cursor = null) {
    const result = await this.findWithCursor(query, { createdAt: -1 }, limit, cursor);

    // Populate role for items
    if (result.items.length > 0) {
      await Employee.populate(result.items, { path: 'role' });
    }

    return {
      employees: result.items,
      total: await this.count(query),
      nextCursor: result.nextCursor,
      limit
    };
  }

  async updateById(id, updateData) {
    return await Employee.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('role', 'name permissions isActive')
      .lean();
  }

  async deleteById(id) {
    return await Employee.findByIdAndDelete(id);
  }

  async count(query = {}) {
    return await Employee.countDocuments(query);
  }
}

export default new EmployeeRepository();
