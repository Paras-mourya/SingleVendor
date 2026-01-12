import User from '../models/user.model.js';

class UserRepository {
  async create(userData, options = {}) {
    return await User.create([userData], options).then(res => res[0]);
  }

  async findByEmail(email, selectPassword = false) {
    const query = User.findOne({ email });
    if (selectPassword) {
      query.select('+password');
    }
    return await query;
  }

  async findById(id) {
    return await User.findById(id);
  }

  async updateById(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
