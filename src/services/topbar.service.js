import TopbarRepository from '../repositories/topbar.repository.js';
import MultiLayerCache from '../utils/multiLayerCache.js';

class TopbarService {
  /**
   * Helper to invalidate public topbar cache
   */
  async invalidateCache() {
    await MultiLayerCache.delByPattern('response:/api/v1/topbar/public*');
  }

  async saveTopbar(topbarData) {
    const topbar = await TopbarRepository.upsertTopbar(topbarData);
    await this.invalidateCache();
    return topbar;
  }

  async getTopbar() {
    return await TopbarRepository.getTopbar();
  }

  async getPublicTopbar() {
    const topbar = await TopbarRepository.getTopbar();
    if (topbar && topbar.status === 'active') {
      return topbar;
    }
    return null;
  }
}

export default new TopbarService();
