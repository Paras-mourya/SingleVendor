import mongoose from 'mongoose';

const siteContentSchema = new mongoose.Schema(
  {
    aboutUs: {
      type: String,
      default: '',
    },
    termsAndConditions: {
      type: String,
      default: '',
    },
    privacyPolicy: {
      type: String,
      default: '',
    },
    refundPolicy: {
      type: String,
      default: '',
    },
    returnPolicy: {
      type: String,
      default: '',
    },
    shippingPolicy: {
      type: String,
      default: '',
    },
    cancellationPolicy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Singleton-like approach for site settings/content.
 * We will usually only have one document in this collection.
 */
const SiteContent = mongoose.model('SiteContent', siteContentSchema);

export default SiteContent;
