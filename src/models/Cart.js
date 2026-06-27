const mongoose = require('mongoose');

/**
 * CartItem Sub-document Schema
 * Embedded within the Cart document for atomic reads.
 * Denormalizes product data (name, price) at write-time to prevent
 * stale-price issues at checkout if a product's price changes later.
 */
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, 'Product ID is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // Sub-document; productId is the natural key
);

/**
 * Cart Schema
 * One active cart per user at a time. TTL index on `expiresAt` enables
 * automatic cleanup of abandoned carts without any cron job (Feature X).
 * Status transitions: active -> checked_out | abandoned
 */
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [cartItemSchema],
    status: {
      type: String,
      enum: ['active', 'checked_out', 'abandoned'],
      default: 'active',
    },
    // TTL Field — MongoDB background task deletes document when this date is reached
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB TTL index — automatically deletes expired/abandoned carts (Feature X)
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast user+status queries
cartSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Cart', cartSchema);
