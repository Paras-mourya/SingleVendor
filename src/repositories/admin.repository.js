import Admin from '../models/admin.model.js';
import MultiLayerCache from '../utils/multiLayerCache.js';

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

    // Cache-Aside Pattern: Check cache first, fetch from DB if miss
    return await MultiLayerCache.get(cacheKey, async () => {
      // Fetch from DB with proper field selection
      const query = Admin.findById(id).lean();
      if (selectFields) {
        query.select(selectFields);
      }
      const admin = await query;
      
      // Cache will be automatically set by MultiLayerCache
      return admin;
    }, 3600); // 1 hour TTL
  }

  async updateById(id, updateData) {
    const result = await Admin.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    
    // Invalidate cache after update
    if (result) {
      await MultiLayerCache.del(`${ADMIN_CACHE_PREFIX}${id}`);
    }
    
    return result;
  }

  async delete(id) {
    const result = await Admin.findByIdAndDelete(id).lean();
    
    // Invalidate cache after delete
    if (result) {
      await MultiLayerCache.del(`${ADMIN_CACHE_PREFIX}${id}`);
    }
    
    return result;
  }

  async getByIdFull(id) {
    return await Admin.findById(id).lean();
  }

  async count() {
    const cacheKey = 'admin:count';
    
    return await MultiLayerCache.get(cacheKey, async () => {
      return await Admin.countDocuments();
    }, 1800); // 30 minutes TTL for count
  }

  // Cache management methods
  async invalidateAdminCache(adminId) {
    await MultiLayerCache.del(`${ADMIN_CACHE_PREFIX}${adminId}`);
    await MultiLayerCache.delByPattern(`${ADMIN_CACHE_PREFIX}*`);
  }

  async invalidateAllAdminCache() {
    await MultiLayerCache.delByPattern(`${ADMIN_CACHE_PREFIX}*`);
  }
}

export default new AdminRepository();
