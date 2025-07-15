const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user');

/**
 * Organizer Controller
 * Handles organizer account setup and Stripe Connect integration
 */
const organizerController = {
  /**
   * Create Stripe Connect account for organizer
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createStripeAccount: async (req, res) => {
    try {
      const { country, email, businessType = 'individual' } = req.body;
      
      if (!country || !email) {
        return res.status(400).json({
          success: false,
          message: 'Country and email are required'
        });
      }
      
      // Check if user is already an organizer
      if (req.user.role !== 'organizer') {
        return res.status(403).json({
          success: false,
          message: 'Only organizers can create Stripe accounts'
        });
      }
      
      // Check if user already has a Stripe account
      if (req.user.stripeCustomerId) {
        return res.status(400).json({
          success: false,
          message: 'Stripe account already exists'
        });
      }
      
      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: email,
        business_type: businessType,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        },
        metadata: {
          userId: req.user._id.toString()
        }
      });
      
      // Update user with Stripe account ID
      await User.findByIdAndUpdate(req.user._id, {
        stripeCustomerId: account.id
      });
      
      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL}/organizer/stripe-connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/organizer/stripe-connect/success`,
        type: 'account_onboarding'
      });
      
      res.status(200).json({
        success: true,
        message: 'Stripe account created successfully',
        data: {
          accountId: account.id,
          accountLink: accountLink.url
        }
      });
    } catch (error) {
      console.error('Create Stripe account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create Stripe account',
        error: error.message
      });
    }
  },
  
  /**
   * Get organizer's Stripe account status
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getStripeAccountStatus: async (req, res) => {
    try {
      if (!req.user.stripeCustomerId) {
        return res.status(200).json({
          success: true,
          data: {
            hasAccount: false,
            status: 'not_setup'
          }
        });
      }
      
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(req.user.stripeCustomerId);
      
      res.status(200).json({
        success: true,
        data: {
          hasAccount: true,
          accountId: account.id,
          status: account.charges_enabled ? 'active' : 'pending',
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        }
      });
    } catch (error) {
      console.error('Get Stripe account status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Stripe account status',
        error: error.message
      });
    }
  },
  
  /**
   * Create account link for onboarding
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createAccountLink: async (req, res) => {
    try {
      if (!req.user.stripeCustomerId) {
        return res.status(400).json({
          success: false,
          message: 'No Stripe account found'
        });
      }
      
      const accountLink = await stripe.accountLinks.create({
        account: req.user.stripeCustomerId,
        refresh_url: `${process.env.FRONTEND_URL}/organizer/stripe-connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/organizer/stripe-connect/success`,
        type: 'account_onboarding'
      });
      
      res.status(200).json({
        success: true,
        data: {
          accountLink: accountLink.url
        }
      });
    } catch (error) {
      console.error('Create account link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create account link',
        error: error.message
      });
    }
  },
  
  /**
   * Get organizer's payment summary
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getPaymentSummary: async (req, res) => {
    try {
      const Ticket = require('../models/ticket');
      
      // Get all tickets for this organizer
      const tickets = await Ticket.find({ organizer: req.user._id })
        .populate('eventId');
      
      const summary = {
        totalTickets: tickets.length,
        totalRevenue: 0,
        platformFees: 0,
        organizerPayments: 0,
        pendingTransfers: 0,
        completedTransfers: 0,
        failedTransfers: 0
      };
      
      tickets.forEach(ticket => {
        if (ticket.paymentStatus === 'paid') {
          summary.totalRevenue += ticket.ticketPrice;
          summary.platformFees += ticket.platformFee;
          summary.organizerPayments += ticket.organizerPayment;
          
          if (ticket.organizerTransferStatus === 'pending') {
            summary.pendingTransfers++;
          } else if (ticket.organizerTransferStatus === 'completed') {
            summary.completedTransfers++;
          } else if (ticket.organizerTransferStatus === 'failed') {
            summary.failedTransfers++;
          }
        }
      });
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get payment summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment summary',
        error: error.message
      });
    }
  }
};

module.exports = organizerController; 