const { validationResult } = require('express-validator');

/**
 * Centralized Request Validation Middleware
 *
 * Runs after express-validator chain rules and collects all field errors.
 * Returns a structured 400 Bad Request with all validation failures at once
 * (not just the first one), improving client-side form UX and debugging.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};

/**
 * Session Authentication Middleware
 *
 * Extracts the x-session-token header and resolves it to a User document.
 * Attaches userId to req so downstream controllers can scope operations
 * to the correct tenant without re-querying the User collection each time.
 */
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const token = req.headers['x-session-token'];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide x-session-token header.',
    });
  }

  try {
    const user = await User.findOne({ sessionToken: token }).select('_id username');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token.',
      });
    }

    // Attach user context to request for downstream use
    req.userId = user._id;
    req.username = user.username;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateRequest, authenticate };
