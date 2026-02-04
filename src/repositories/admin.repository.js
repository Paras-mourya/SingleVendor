import Admin from '../models/admin.model.js';
import Cache from '../utils/cache.js';

const ADMIN_CACHE_PREFIX = 'admin:profile:';

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
    return await query.lean();
  }

  async findById(id, selectFields = '') {
    const cacheKey = `${ADMIN_CACHE_PREFIX}${id}`;

    // 1. Try cache
    const cachedAdmin = await Cache.get(cacheKey);
    if (cachedAdmin) return cachedAdmin;

    // 2. Fetch from DB
    const query = Admin.findById(id).lean();
    if (selectFields) {
      query.select(selectFields);
    }
    const admin = await query;

    // 3. Store in cache (expire in 1 hour)
    if (admin) {
      await Cache.set(cacheKey, admin, 3600);
    }

    return admin;
  }

  async updateById(id, updateData) {
    return await Admin.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
  }

  async getByIdFull(id) {
    return await Admin.findById(id);
  }

  async count() {
    return await Admin.countDocuments();
  }
}

export default new AdminRepository();
