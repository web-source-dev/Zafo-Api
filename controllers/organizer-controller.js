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
      
      // Check if user is organizer or admin
      if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Organizer permission required.'
        });
      }
      
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
        failedTransfers: 0,
        paidTickets: 0,
        pendingTickets: 0,
        refundedTickets: 0,
        totalAttendees: 0
      };
      
      // Calculate totals from all tickets
      tickets.forEach(ticket => {
        // Count total attendees
        summary.totalAttendees += ticket.quantity;
        
        // Count tickets by payment status
        if (ticket.paymentStatus === 'paid') {
          summary.paidTickets += ticket.quantity;
          summary.totalRevenue += ticket.ticketPrice;
          summary.platformFees += ticket.platformFee;
          summary.organizerPayments += ticket.organizerPayment;
        } else if (ticket.paymentStatus === 'pending') {
          summary.pendingTickets += ticket.quantity;
          summary.totalRevenue += ticket.ticketPrice;
          summary.platformFees += ticket.platformFee;
          summary.organizerPayments += ticket.organizerPayment;
        } else if (ticket.paymentStatus === 'partially_refunded') {
          summary.paidTickets += ticket.quantity;
          summary.totalRevenue += ticket.ticketPrice;
          summary.platformFees += ticket.platformFee;
          summary.organizerPayments += ticket.organizerPayment;
        } else if (ticket.paymentStatus === 'refunded') {
          summary.refundedTickets += ticket.quantity;
        }
        
        // Count transfer statuses
        if (ticket.organizerTransferStatus === 'pending') {
          summary.pendingTransfers += ticket.quantity;
        } else if (ticket.organizerTransferStatus === 'completed') {
          summary.completedTransfers += ticket.quantity;
        } else if (ticket.organizerTransferStatus === 'failed') {
          summary.failedTransfers += ticket.quantity;
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
  },

  /**
   * Get comprehensive organizer dashboard overview
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getDashboardOverview: async (req, res) => {
    try {
      const Event = require('../models/event');
      const Ticket = require('../models/ticket');
      
      // Check if user is organizer or admin
      if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Organizer permission required.'
        });
      }
      
      // Get all events for this organizer
      const events = await Event.find({ organizer: req.user._id });
      
      // Get all tickets for this organizer with populated data
      const tickets = await Ticket.find({ organizer: req.user._id })
        .populate('eventId', 'title startDate endDate location category capacity')
        .populate('attendee', 'firstName lastName email');
      
      // Calculate event statistics
      const eventStats = {
        totalEvents: events.length,
        publishedEvents: events.filter(e => e.status === 'published').length,
        draftEvents: events.filter(e => e.status === 'draft').length,
        completedEvents: events.filter(e => e.status === 'completed').length,
        canceledEvents: events.filter(e => e.status === 'canceled').length,
        pendingPaymentEvents: events.filter(e => e.status === 'pending_payment').length
      };
      
      // Calculate ticket statistics - only count paid tickets for revenue
      const paidTickets = tickets.filter(t => t.paymentStatus === 'paid');
      const pendingTickets = tickets.filter(t => t.paymentStatus === 'pending');
      const refundedTickets = tickets.filter(t => t.paymentStatus === 'refunded');
      const partiallyRefundedTickets = tickets.filter(t => t.paymentStatus === 'partially_refunded');
      
      // Calculate total attendees from all tickets (not just paid)
      const totalAttendees = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
      
      // Calculate revenue only from paid tickets (including partially refunded with remaining amounts)
      const totalRevenue = paidTickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0) + 
                          partiallyRefundedTickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0);
      const platformFees = paidTickets.reduce((sum, ticket) => sum + ticket.platformFee, 0) + 
                          partiallyRefundedTickets.reduce((sum, ticket) => sum + ticket.platformFee, 0);
      const organizerPayments = paidTickets.reduce((sum, ticket) => sum + ticket.organizerPayment, 0) + 
                               partiallyRefundedTickets.reduce((sum, ticket) => sum + ticket.organizerPayment, 0);
      
      const ticketStats = {
        totalTickets: tickets.length,
        paidTickets: paidTickets.length + partiallyRefundedTickets.length,
        pendingTickets: pendingTickets.length,
        refundedTickets: refundedTickets.length + partiallyRefundedTickets.length,
        totalAttendees: totalAttendees,
        totalRevenue: totalRevenue,
        platformFees: platformFees,
        organizerPayments: organizerPayments,
        averageTicketPrice: totalRevenue / totalAttendees
      };
      
      // Calculate transfer statistics
      const transferStats = {
        pendingTransfers: tickets.filter(t => t.organizerTransferStatus === 'pending').length,
        completedTransfers: tickets.filter(t => t.organizerTransferStatus === 'completed').length,
        failedTransfers: tickets.filter(t => t.organizerTransferStatus === 'failed').length
      };
      
      // Calculate monthly revenue for the last 6 months
      const monthlyRevenue = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        
        const monthTickets = paidTickets.filter(ticket => {
          const ticketDate = new Date(ticket.purchasedAt);
          return ticketDate.getFullYear() === month.getFullYear() && 
                 ticketDate.getMonth() === month.getMonth();
        });
        
        const monthPartiallyRefundedTickets = partiallyRefundedTickets.filter(ticket => {
          const ticketDate = new Date(ticket.purchasedAt);
          return ticketDate.getFullYear() === month.getFullYear() && 
                 ticketDate.getMonth() === month.getMonth();
        });
        
        const monthRevenue = monthTickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0) + 
                           monthPartiallyRefundedTickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0);
        const monthTicketsCount = monthTickets.reduce((sum, ticket) => sum + ticket.quantity, 0) + 
                                 monthPartiallyRefundedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
        
        monthlyRevenue.push({
          month: monthKey,
          revenue: monthRevenue,
          tickets: monthTicketsCount
        });
      }
      
      // Get recent events with enhanced data
      const recentEvents = events
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(event => {
          const eventTickets = tickets.filter(t => 
            typeof t.eventId === 'object' && t.eventId._id.toString() === event._id.toString()
          );
          const soldTickets = eventTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
          const eventRevenue = eventTickets
            .filter(t => t.paymentStatus === 'paid' || t.paymentStatus === 'partially_refunded')
            .reduce((sum, ticket) => sum + ticket.ticketPrice, 0);
          
          return {
            _id: event._id,
            title: event.title,
            status: event.status,
            startDate: event.startDate,
            endDate: event.endDate,
            soldTickets,
            totalRevenue: eventRevenue,
            capacity: event.capacity,
            category: event.category,
            location: event.location
          };
        });
      
      // Get recent ticket sales
      const recentTickets = tickets
        .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
        .slice(0, 5)
        .map(ticket => ({
          _id: ticket._id,
          eventId: ticket.eventId,
          quantity: ticket.quantity,
          totalAmount: ticket.ticketPrice,
          paymentStatus: ticket.paymentStatus,
          purchasedAt: ticket.purchasedAt,
          attendee: ticket.attendee
        }));
      
      // Get refund requests
      const refundRequests = tickets.filter(ticket => 
        ticket.refundStatus === 'requested' || 
        ticket.ticketDetails.some(detail => detail.refundStatus === 'requested')
      );
      
      // Get Stripe account status
      let stripeAccountStatus = {
        hasAccount: false,
        status: 'not_setup'
      };
      
      if (req.user.stripeCustomerId) {
        try {
          const account = await stripe.accounts.retrieve(req.user.stripeCustomerId);
          stripeAccountStatus = {
            hasAccount: true,
            accountId: account.id,
            status: account.charges_enabled ? 'active' : 'pending',
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled
          };
        } catch (stripeError) {
          console.error('Stripe account retrieval error:', stripeError);
          // Keep default status if Stripe call fails
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          eventStats,
          ticketStats,
          transferStats,
          monthlyRevenue,
          recentEvents,
          recentTickets,
          refundRequests: refundRequests.length,
          stripeAccountStatus
        }
      });
    } catch (error) {
      console.error('Get dashboard overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard overview',
        error: error.message
      });
    }
  }
};

module.exports = organizerController; 