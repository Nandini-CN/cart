const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate, validateRequest } = require('../middleware/validateRequest');
const {
  addItemValidator,
  updateItemQuantityValidator,
  removeItemValidator,
} = require('../validators/cartValidator');

// Protect all cart endpoints with session-based authentication
router.use(authenticate);

// GET /api/cart - Get active cart
router.get('/', cartController.getCart);

// POST /api/cart/items - Add item or increment quantity
router.post('/items', addItemValidator, validateRequest, cartController.addItem);

// PATCH /api/cart/items/:productId - Directly modify item quantity
router.patch('/items/:productId', updateItemQuantityValidator, validateRequest, cartController.updateItemQuantity);

// DELETE /api/cart/items/:productId - Remove item completely
router.delete('/items/:productId', removeItemValidator, validateRequest, cartController.removeItem);

// DELETE /api/cart - Clear cart
router.delete('/', cartController.clearCart);

module.exports = router;
