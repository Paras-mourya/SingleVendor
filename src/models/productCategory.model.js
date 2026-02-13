import mongoose from 'mongoose';

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    logo: {
      type: {
        url: String,
        publicId: String,
      },
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

productCategorySchema.index({ status: 1, createdAt: -1 });

const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);

export default ProductCategory;
