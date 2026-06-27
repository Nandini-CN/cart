const cartService = require('../services/cartService');

/**
 * Handles incoming cart API request mapping.
 */
class CartController {
  /**
   * GET /api/cart
   * Retrieves user's active cart.
   */
  async getCart(req, res, next) {
    try {
      const cart = await cartService.getCart(req.userId);
      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cart/items
   * Adds or increments product quantity in user's active cart.
   */
  async addItem(req, res, next) {
    try {
      const cart = await cartService.addItem(req.userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Item updated/added in cart successfully.',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/cart/items/:productId
   * Directly sets/overwrites quantity of a product in the cart.
   */
  async updateItemQuantity(req, res, next) {
    const { productId } = req.params;
    const { quantity } = req.body;

    try {
      const cart = await cartService.updateItemQuantity(req.userId, productId, quantity);
      res.status(200).json({
        success: true,
        message: 'Item quantity updated successfully.',
        data: cart,
      });
    } catch (error) {
      if (error.message === 'Cart not found' || error.message === 'Item not found in cart') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/cart/items/:productId
   * Removes a product completely from the user's active cart.
   */
  async removeItem(req, res, next) {
    const { productId } = req.params;

    try {
      const cart = await cartService.removeItem(req.userId, productId);
      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully.',
        data: cart,
      });
    } catch (error) {
      if (error.message === 'Cart not found' || error.message === 'Item not found in cart') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/cart
   * Clears all items in the user's active cart.
   */
  async clearCart(req, res, next) {
    try {
      const cart = await cartService.clearCart(req.userId);
      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully.',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();
