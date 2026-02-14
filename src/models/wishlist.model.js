import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true, // One wishlist per customer
  },
  items: [wishlistItemSchema]
}, {
  timestamps: true,
  versionKey: false
});

// Compound index for fast product lookup
wishlistSchema.index({ customerId: 1, 'items.product': 1 });

// Virtual for total items count
wishlistSchema.virtual('totalItems').get(function () {
  return this.items.length;
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
