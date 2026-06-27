const Campaign = require('../models/Campaign');

/**
 * Service to calculate tiered promotions and cart diversity rewards.
 */
class PromotionService {
  /**
   * Default fallback campaign parameters if none exist in the database.
   * This ensures the checkout endpoint always works out-of-the-box.
   */
  getDefaultCampaign() {
    return {
      name: 'Default Storewide Tiered Campaign',
      isActive: true,
      tiers: [
        { label: 'Bronze Discount', minValue: 500, maxValue: 999, discountPct: 5 },
        { label: 'Silver Discount', minValue: 1000, maxValue: 1999, discountPct: 10 },
        { label: 'Gold Discount', minValue: 2000, maxValue: null, discountPct: 15 },
      ],
      diversityBonus: {
        minCategories: 3,
        bonusPct: 2,
      },
    };
  }

  /**
   * Fetches the currently active promotion campaign from database,
   * fallback to default campaign if none found.
   */
  async getActiveCampaign() {
    try {
      const dbCampaign = await Campaign.findOne({ isActive: true });
      return dbCampaign || this.getDefaultCampaign();
    } catch (error) {
      // Robust fallback on DB lookup failure
      return this.getDefaultCampaign();
    }
  }

  /**
   * Performs promotional calculations on the items of a cart.
   */
  async calculateCheckoutSummary(cart) {
    const items = cart.items || [];

    // 1. Calculate Subtotal
    let subtotal = 0;
    const categoriesSet = new Set();

    items.forEach((item) => {
      subtotal += item.price * item.quantity;
      if (item.category) {
        categoriesSet.add(item.category.trim().toLowerCase());
      }
    });

    subtotal = Math.round(subtotal * 100) / 100; // Round to 2 decimal places

    // 2. Fetch Active Campaign
    const campaign = await this.getActiveCampaign();

    // 3. Find Applicable Tier Discount
    let appliedTier = { label: 'No discount tier applied', discountPct: 0 };
    if (campaign && campaign.tiers) {
      // Find the highest tier where subtotal matches the bounds
      const matchingTier = campaign.tiers.find((tier) => {
        const meetsMin = subtotal >= tier.minValue;
        const meetsMax = tier.maxValue === null || tier.maxValue === undefined || subtotal <= tier.maxValue;
        return meetsMin && meetsMax;
      });

      if (matchingTier) {
        appliedTier = {
          label: matchingTier.label,
          discountPct: matchingTier.discountPct,
        };
      }
    }

    // Calculate Tier discount amount
    const tierDiscountAmount = Math.round((subtotal * (appliedTier.discountPct / 100)) * 100) / 100;

    // 4. Calculate Category Diversity Bonus
    let appliedDiversityBonus = { label: 'No category diversity bonus', discountPct: 0 };
    const distinctCategoriesCount = categoriesSet.size;
    const minCategoriesForBonus = campaign?.diversityBonus?.minCategories || 3;
    const bonusPctVal = campaign?.diversityBonus?.bonusPct || 2;

    if (distinctCategoriesCount >= minCategoriesForBonus) {
      appliedDiversityBonus = {
        label: `Diversity Reward (>= ${minCategoriesForBonus} Categories)`,
        discountPct: bonusPctVal,
      };
    }

    // Calculate Diversity discount amount
    const diversityDiscountAmount = Math.round((subtotal * (appliedDiversityBonus.discountPct / 100)) * 100) / 100;

    // 5. Compute Final Pricing
    const totalDiscount = Math.round((tierDiscountAmount + diversityDiscountAmount) * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);

    return {
      campaignName: campaign.name || 'None',
      subtotal,
      appliedDiscounts: {
        tier: {
          name: appliedTier.label,
          percentage: appliedTier.discountPct,
          amount: tierDiscountAmount,
        },
        diversity: {
          name: appliedDiversityBonus.label,
          percentage: appliedDiversityBonus.discountPct,
          amount: diversityDiscountAmount,
          distinctCategoriesCount,
        },
      },
      totalDiscount,
      finalTotal,
    };
  }
}

module.exports = new PromotionService();
