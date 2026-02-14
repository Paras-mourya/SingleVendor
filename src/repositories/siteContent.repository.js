import SiteContent from '../models/siteContent.model.js';

class SiteContentRepository {
  /**
   * Find the singleton site content document.
   * @returns {Promise<Object>}
   */
  async findOne() {
    return await SiteContent.findOne({}).lean();
  }

  /**
   * Update the site content document (upsert if not exists).
   * @param {Object} data - Fields to update.
   * @returns {Promise<Object>}
   */
  async update(data) {
    return await SiteContent.findOneAndUpdate(
      {},
      { $set: data },
      { new: true, upsert: true, runValidators: true }
    ).lean();
  }
}

export default new SiteContentRepository();
