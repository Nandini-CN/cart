const { body, param } = require('express-validator');

/**
 * Validator rules for adding/updating items in the cart.
 */
const addItemValidator = [
  body('productId')
    .trim()
    .notEmpty()
    .withMessage('productId is required as a string'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('Price must be a number greater than 0'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer of at least 1'),
];

const updateItemQuantityValidator = [
  param('productId')
    .trim()
    .notEmpty()
    .withMessage('productId param is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer of at least 1'),
];

const removeItemValidator = [
  param('productId')
    .trim()
    .notEmpty()
    .withMessage('productId param is required'),
];

module.exports = {
  addItemValidator,
  updateItemQuantityValidator,
  removeItemValidator,
};
