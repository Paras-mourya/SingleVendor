import Admin from '../models/admin.model.js';

class AdminRepository {
  async create(adminData, options = {}) {
    // If Admin.create is called with an array, it uses sessions correctly if passed in options
    const docs = await Admin.create(Array.isArray(adminData) ? adminData : [adminData], options);
    return Array.isArray(adminData) ? docs : docs[0];
  }

  async findByEmail(email, selectPassword = false) {
    const query = Admin.findOne({ email });
    if (selectPassword) {
      query.select('+password');
    }
    return await query;
  }

  async findById(id) {
    return await Admin.findById(id);
  }

  async updateById(id, updateData) {
    return await Admin.findByIdAndUpdate(id, updateData, { new: true });
  }

  async count() {
    return await Admin.countDocuments();
  }
}

export default new AdminRepository();
