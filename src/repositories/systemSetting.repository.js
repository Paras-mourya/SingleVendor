import SystemSetting from '../models/systemSetting.model.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import Logger from '../utils/logger.js';
import env from '../config/env.js';

class SystemSettingRepository {
  constructor() {
    this.CACHE_KEY = 'system_settings';
    this.CACHE_TTL = 3600; // 1 hour (auto-invalidated on update)
  }

  /**
     * Get Settings (Cached)
     * Uses "Cache-Aside" pattern.
     */
  async getSettings() {
    // 1. Check Cache
    const cached = await MultiLayerCache.get(this.CACHE_KEY);
    if (cached) return cached;

    // 2. Database Fallback (Upsert Pattern)
    // We try to find one, if not exists, we return default structure (but don't save unless needed)
    let settings = await SystemSetting.findOne();

    if (!settings) {
      // Create default if completely missing
      settings = await SystemSetting.create({
        appName: 'Multi Vendor App',
        appDebug: true,
        appMode: 'Dev',
        appUrl: env.APP_URL
      });
      Logger.info('Initialized Default System Settings');
    }

    // 3. Set Cache
    await MultiLayerCache.set(this.CACHE_KEY, settings, this.CACHE_TTL);

    return settings;
  }

  /**
     * Update Settings (Atomic + Cache Invalidation by Pattern)
     */
  async updateSettings(data, userId, userModel) {
    const settings = await SystemSetting.findOne();
    const id = settings ? settings._id : new mongoose.Types.ObjectId();

    const updated = await SystemSetting.findByIdAndUpdate(
      id,
      {
        $set: {
          ...data,
          updatedBy: userId,
          updatedByModel: userModel
        }
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    // Invalidate Cache
    await MultiLayerCache.del(this.CACHE_KEY);

    return updated;
  }
}

export default new SystemSettingRepository();
