const mongoose = require('mongoose');

/**
 * Tier Sub-document Schema
 * Each tier defines a cart value range and the corresponding discount percentage.
 * maxValue: null indicates no upper bound (the highest tier).
 */
const tierSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },       // e.g., "Bronze", "Silver", "Gold"
    minValue: { type: Number, required: true },     // Minimum cart subtotal (inclusive)
    maxValue: { type: Number, default: null },      // Maximum cart subtotal (null = unlimited)
    discountPct: { type: Number, required: true, min: 0, max: 100 }, // Percentage discount
  },
  { _id: false }
);

/**
 * Campaign Schema
 * Stores promotional campaigns with tiered discount rules and diversity bonuses.
 * Only one campaign should be active at a time for predictable behavior.
 * The diversity bonus rewards cart breadth (buying across multiple categories).
 */
const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true, // Fast filter for active campaigns
    },
    tiers: {
      type: [tierSchema],
      validate: {
        validator: (arr) => arr && arr.length > 0,
        message: 'A campaign must have at least one tier',
      },
    },
    // Diversity bonus: extra discount if cart spans enough distinct categories
    diversityBonus: {
      minCategories: { type: Number, default: 3 },
      bonusPct: { type: Number, default: 2 },
    },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null }, // null = no expiry
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Campaign', campaignSchema);
