const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { registerUserValidator } = require('../validators/userValidator');
const { validateRequest, authenticate } = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiter');

// Onboard user (register/login)
router.post('/register', authLimiter, registerUserValidator, validateRequest, userController.registerOrLogin);

// Get current user details (using session authentication)
router.get('/me', authenticate, userController.getMe);

module.exports = router;
