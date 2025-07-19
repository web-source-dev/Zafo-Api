const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizer-controller');
const {authenticate, authorizeOrganizer} = require('../middleware/auth');

// All routes require authentication and organizer authorization
router.use(authenticate);
router.use(authorizeOrganizer);

// Create Stripe Connect account
router.post('/stripe-account', organizerController.createStripeAccount);

// Get Stripe account status
router.get('/stripe-account/status', organizerController.getStripeAccountStatus);

// Create account link for onboarding
router.post('/stripe-account/link', organizerController.createAccountLink);

// Get payment summary
router.get('/payments/summary', organizerController.getPaymentSummary);

// Get comprehensive dashboard overview
router.get('/dashboard/overview', organizerController.getDashboardOverview);

module.exports = router; 