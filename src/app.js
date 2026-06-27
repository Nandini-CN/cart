require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const { morganMiddleware, logger } = require('./middleware/requestLogger');

const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');

const app = express();

// Establish database connection
connectDB();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Feature X: Request Logging Middleware
app.use(morganMiddleware);

// Feature X: Rate Limiting Middleware (Applied globally to all API paths)
app.use('/api', apiLimiter);

// Route mount points
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);

// Base healthcheck route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: isProd ? 'An unexpected server error occurred' : err.message,
    stack: isProd ? undefined : err.stack,
  });
});

// Handle unhandled route matching
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Resource not found: ${req.originalUrl}`,
  });
});

// Listen server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`[SERVER] Shopping Cart Service running on port ${PORT}`);
});

module.exports = app;
