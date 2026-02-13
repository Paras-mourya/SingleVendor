import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: true,
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductSubCategory',
      required: false,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      required: false,
    },
    productType: {
      type: String,
      enum: ['physical', 'digital'],
      default: 'physical',
      required: true,
    },
    unit: {
      type: String, // e.g., 'kg', 'pc', 'ltr'
      required: true,
    },
    searchTags: [
      {
        type: String,
        trim: true,
      },
    ],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderQty: {
      type: Number,
      default: 1,
      min: 1
    },
    purchasePrice: {
      type: Number,
      required: false,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    taxType: {
      type: String,
      enum: ['percent', 'flat'],
      default: 'percent',
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['percent', 'flat'],
      default: 'percent',
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    multiplyShippingCost: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    colors: [
      {
        type: String, // Hex code or Name
      }
    ],
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    thumbnail: {
      url: String,
      publicId: String,
    },
    attributes: [
      {
        attribute: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ProductAttribute',
        },
        values: [String],
      },
    ],
    variations: [
      {
        attributeValues: {
          type: Map,
          of: String, // e.g., { "Size": "L", "Color": "Red" }
        },
        price: Number,
        sku: String,
        stock: Number,
        image: {
          url: String,
          publicId: String
        }
      },
    ],
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaImage: {
        url: String,
        publicId: String
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    videoLink: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for high performance
productSchema.index({ name: 'text', description: 'text', searchTags: 'text' });
productSchema.index({ status: 1, isActive: 1, category: 1, createdAt: -1 }); // Optimized category listings
productSchema.index({ status: 1, isActive: 1, subCategory: 1, createdAt: -1 }); // Optimized subcategory listings
productSchema.index({ status: 1, isActive: 1, isFeatured: 1, createdAt: -1 }); // Optimized homepage
productSchema.index({ status: 1, isActive: 1, price: 1, createdAt: -1 }); // Optimized price sorting
productSchema.index({ status: 1, isActive: 1, createdAt: -1 }); // Fast recent listings

const Product = mongoose.model('Product', productSchema);

export default Product;
