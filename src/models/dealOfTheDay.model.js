import mongoose from 'mongoose';

const dealOfTheDaySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    discountType: {
      type: String,
      enum: ['flat', 'percent'],
      default: 'percent'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isPublished: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const DealOfTheDay = mongoose.model('DealOfTheDay', dealOfTheDaySchema);

// Performance indexes for deal queries
dealOfTheDaySchema.index({ isPublished: 1 });
dealOfTheDaySchema.index({ createdAt: -1 });

export default DealOfTheDay;
