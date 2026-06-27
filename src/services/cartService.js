const Cart = require('../models/Cart');

/**
 * Service to manage Shopping Cart operations.
 */
class CartService {
  /**
   * Helper to retrieve or create the active cart for a user.
   * Extends the expiry (TTL) on retrieval or creation.
   */
  async getOrCreateActiveCart(userId) {
    let cart = await Cart.findOne({ userId, status: 'active' });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Extend cart TTL to 7 days from now on access/mutation
    cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return cart;
  }

  /**
   * Retrieves the active cart for a user.
   */
  async getCart(userId) {
    const cart = await Cart.findOne({ userId, status: 'active' });
    if (cart) {
      // Extend TTL on read
      cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await cart.save();
    }
    return cart || { userId, items: [], status: 'active' };
  }

  /**
   * Adds an item to the user's cart or increments quantity if it exists.
   */
  async addItem(userId, itemData) {
    const cart = await this.getOrCreateActiveCart(userId);
    const existingItem = cart.items.find(
      (item) => item.productId === itemData.productId
    );

    const qtyToAdd = itemData.quantity || 1;

    if (existingItem) {
      existingItem.quantity += qtyToAdd;
      // Overwrite name, price, and category in case they changed in catalog
      existingItem.name = itemData.name;
      existingItem.price = itemData.price;
      existingItem.category = itemData.category;
    } else {
      cart.items.push({
        productId: itemData.productId,
        name: itemData.name,
        category: itemData.category,
        price: itemData.price,
        quantity: qtyToAdd,
      });
    }

    await cart.save();
    return cart;
  }

  /**
   * Modifies/Updates item quantity directly.
   */
  async updateItemQuantity(userId, productId, quantity) {
    const cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const item = cart.items.find((item) => item.productId === productId);
    if (!item) {
      throw new Error('Item not found in cart');
    }

    item.quantity = quantity;
    cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend TTL

    await cart.save();
    return cart;
  }

  /**
   * Removes an item from the cart.
   */
  async removeItem(userId, productId) {
    const cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.productId === productId);
    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    cart.items.splice(itemIndex, 1);
    cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend TTL

    await cart.save();
    return cart;
  }

  /**
   * Clears the cart.
   */
  async clearCart(userId) {
    const cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
      return { userId, items: [], status: 'active' };
    }

    cart.items = [];
    cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend TTL
    await cart.save();
    return cart;
  }
}

module.exports = new CartService();
