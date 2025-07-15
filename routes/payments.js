const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const { authenticate, authorizeOrganizer } = require('../middleware/auth');

/**
 * Custom middleware to conditionally apply authentication
 * If sessionId is provided in the query, skip authentication
 * Otherwise, apply the normal authentication middleware
 */
const conditionalAuth = (req, res, next) => {
  if (req.query.sessionId) {
    // Skip authentication if sessionId is provided
    return next();
  }
  // Apply normal authentication
  return authenticate(req, res, next);
};

/**
 * @route   POST /api/payments/create-session
 * @desc    Create a Stripe checkout session for event platform fee
 * @access  Private (Organizer/Admin)
 */
router.post('/create-session', authenticate, authorizeOrganizer, paymentController.createCheckoutSession);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

/**
 * @route   GET /api/payments/verify/:eventId
 * @desc    Verify payment status of an event
 * @access  Private (Organizer/Admin) or Public with sessionId
 */
router.get('/verify/:eventId', conditionalAuth, paymentController.verifyPayment);

module.exports = router; 