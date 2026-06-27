const rateLimit = require('express-rate-limit');

/**
 * Feature X: Rate Limiting Middleware
 *
 * WHY: In production microservices, unbounded request rates create DoS attack
 * vectors, inflate infrastructure costs, and degrade service quality for
 * legitimate users. Rate limiting is a first-line defense that enforces
 * fair usage policies without application-level changes.
 *
 * STRATEGY:
 * - General API limiter: 100 requests per 15-minute window per IP
 * - Auth limiter (stricter): 10 requests per 15 minutes for registration
 *   to prevent user enumeration and brute-force attacks
 */

// General limiter applied to all /api routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Returns RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

// Strict limiter for user registration endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { apiLimiter, authLimiter };
