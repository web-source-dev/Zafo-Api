const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription-controller');
const { authenticate, authorizeOrganizer, requireSubscription } = require('../middleware/auth');

// Get all subscription plans (public)
router.get('/plans', subscriptionController.getPlans);

// Get specific plan by ID (public)
router.get('/plans/:id', subscriptionController.getPlanById);

// Get current user's subscription (authenticated)
router.get('/me', authenticate, subscriptionController.getCurrentSubscription);

// Create checkout session (organizer only)
router.post(
  '/create-checkout-session',
  authenticate,
  authorizeOrganizer,
  subscriptionController.createCheckoutSession
);

// Handle successful checkout (authenticated)
router.post(
  '/checkout-success',
  authenticate,
  subscriptionController.handleCheckoutSuccess
);

// Cancel subscription (authenticated)
router.post(
  '/cancel',
  authenticate,
  subscriptionController.cancelCurrentSubscription
);

// Change subscription plan (authenticated)
router.post(
  '/change-plan',
  authenticate,
  authorizeOrganizer,
  subscriptionController.changeSubscriptionPlan
);

// Sync subscription with Stripe (authenticated)
router.post(
  '/sync',
  authenticate,
  subscriptionController.syncSubscriptionWithStripe
);

// Stripe webhook handler (no auth - secured by Stripe signature)
router.post(
  '/webhook',
  subscriptionController.handleWebhook
);

// Premium features endpoint (requires subscription)
router.get(
  '/premium-features',
  authenticate,
  requireSubscription,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'You have access to premium features!',
      data: {
        features: [
          'Advanced analytics',
          'Priority support',
          'Custom branding',
          'Unlimited events'
        ]
      }
    });
  }
);

module.exports = router; 