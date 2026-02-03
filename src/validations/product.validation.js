import { z } from 'zod';
import { REGEX } from '../constants.js';

const productSchema = {
    body: z.object({
        name: z.string().min(1, 'Product name is required'),
        description: z.string().min(1, 'Description is required'),
        category: z.string().regex(REGEX.MONGODB_ID, 'Invalid category ID'),
        subCategory: z.string().regex(REGEX.MONGODB_ID, 'Invalid sub-category ID').optional(),
        brand: z.string().optional(),
        productType: z.enum(['physical', 'digital']).default('physical'),
        unit: z.string().min(1, 'Unit is required'),
        searchTags: z.array(z.string()).optional(),
        price: z.number().min(0, 'Price cannot be negative'),
        minOrderQty: z.number().min(1).default(1),
        purchasePrice: z.number().min(0).optional(),
        tax: z.number().min(0).default(0),
        taxType: z.enum(['percent', 'flat']).default('percent'),
        discount: z.number().min(0).default(0),
        discountType: z.enum(['percent', 'flat']).default('percent'),
        shippingCost: z.number().min(0).default(0),
        multiplyShippingCost: z.boolean().default(false),
        quantity: z.number().min(0).default(0),
        sku: z.string().min(1, 'SKU is required'),
        colors: z.array(z.string()).optional(),
        images: z.array(z.object({
            url: z.string().url(),
            publicId: z.string()
        })).optional(),
        thumbnail: z.object({
            url: z.string().url(),
            publicId: z.string()
        }).optional(),
        attributes: z.array(z.object({
            attribute: z.string().regex(REGEX.MONGODB_ID),
            values: z.array(z.string())
        })).optional(),
        variations: z.array(z.object({
            attributeValues: z.record(z.string()),
            price: z.number().min(0),
            sku: z.string(),
            stock: z.number().min(0),
            image: z.object({
                url: z.string().url().optional(),
                publicId: z.string().optional()
            }).optional()
        })).optional(),
        seo: z.object({
            metaTitle: z.string().optional(),
            metaDescription: z.string().optional(),
            metaImage: z.object({
                url: z.string().url(),
                publicId: z.string()
            }).optional()
        }).optional(),
        isFeatured: z.boolean().default(false),
        videoLink: z.string().url().optional()
    })
};

const updateProductSchema = {
    body: productSchema.body.partial()
};

const toggleStatusSchema = {
    body: z.object({
        status: z.enum(['active', 'inactive']).optional(),
        isActive: z.boolean().optional()
    }).refine(data => data.status !== undefined || data.isActive !== undefined, {
        message: "Either status or isActive must be provided"
    })
};

const restockSchema = {
    body: z.object({
        quantity: z.number().int().positive('Restock quantity must be a positive integer')
    })
};

export { productSchema, updateProductSchema, toggleStatusSchema, restockSchema };
