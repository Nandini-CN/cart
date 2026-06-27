const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { authenticate } = require('../middleware/validateRequest');

// GET /api/checkout/summary - Calculate pricing breakdown (guarded by session authentication)
router.get('/summary', authenticate, checkoutController.getCheckoutSummary);

// GET /api/checkout/campaigns - Get all campaigns (open access for marketing frontend)
router.get('/campaigns', checkoutController.getCampaigns);

// POST /api/checkout/campaigns - Create a campaign (Admin/utility route)
router.post('/campaigns', checkoutController.createCampaign);

module.exports = router;
