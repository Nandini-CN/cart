const cartService = require('../services/cartService');
const promotionService = require('../services/promotionService');
const Campaign = require('../models/Campaign');

/**
 * Handles checkout computations and campaign lists.
 */
class CheckoutController {
  /**
   * GET /api/checkout/summary
   * Compiles the items in the user's cart, subtotal, applies campaigns, and returns checkout sums.
   */
  async getCheckoutSummary(req, res, next) {
    try {
      const cart = await cartService.getCart(req.userId);

      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Cart is empty. Checkout summary shows zero totals.',
          data: {
            subtotal: 0,
            appliedDiscounts: {
              tier: { name: 'None', percentage: 0, amount: 0 },
              diversity: { name: 'None', percentage: 0, amount: 0, distinctCategoriesCount: 0 },
            },
            totalDiscount: 0,
            finalTotal: 0,
          },
        });
      }

      const summary = await promotionService.calculateCheckoutSummary(cart);

      res.status(200).json({
        success: true,
        data: {
          cartId: cart._id,
          items: cart.items,
          ...summary,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/checkout/campaigns
   * Lists campaigns stored in the database.
   */
  async getCampaigns(req, res, next) {
    try {
      const campaigns = await Campaign.find({});
      res.status(200).json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/checkout/campaigns
   * Create a new campaign (Optional utility for demo setup / testing).
   */
  async createCampaign(req, res, next) {
    try {
      // Deactivate all previous campaigns first to ensure only one is active at a time
      if (req.body.isActive === true) {
        await Campaign.updateMany({}, { isActive: false });
      }

      const campaign = new Campaign(req.body);
      await campaign.save();

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully.',
        data: campaign,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CheckoutController();
