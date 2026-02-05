import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    variation: {
        type: Object, // Structured variation info
        default: null
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
        max: [100, 'Quantity cannot exceed 100'],
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const cartSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null,
        index: true,
        sparse: true
    },
    guestId: {
        type: String,
        default: null,
        index: true,
        sparse: true,
        validate: {
            validator: function (v) {
                // Allow simple guest strings or UUIDs
                return !v || v.length > 5;
            },
            message: 'Invalid guest ID format'
        }
    },
    items: [cartItemSchema],
    totalPrice: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes for fast product-in-cart checks
cartSchema.index({ customerId: 1, 'items.product': 1 });
cartSchema.index({ guestId: 1, 'items.product': 1 });

// TTL index for auto-cleanup of expired guest carts (MongoDB background job)
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Validation and Expiry Logic
cartSchema.pre('save', async function () {
    // 1. Either customerId OR guestId must be present
    if (!this.customerId && !this.guestId) {
        throw new Error('Either customerId or guestId must be provided');
    }

    // 2. Prevent having both (though guestId is cleared on login merge)
    if (this.customerId && this.guestId) {
        // If both exist, we prioritize customerId (merging phase)
    }

    // 3. Set expiry for guest carts (7 days) if not already set
    if (this.guestId && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // 4. Recalculate total price
    this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Virtual for total items count
cartSchema.virtual('totalItems').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
