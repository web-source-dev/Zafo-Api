const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Ticket = require('../models/ticket');
const Event = require('../models/event');
const User = require('../models/user');

/**
 * Ticket Controller
 * Handles all ticket-related operations including purchases, refunds, and transfers
 */
const ticketController = {
  /**
   * Create a ticket purchase
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createTicketPurchase: async (req, res) => {
    try {
      const { eventId, ticketPrice, currency = 'CHF', quantity = 1, ticketDetails } = req.body;
      
      if (!eventId || !ticketPrice || !quantity || !ticketDetails) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Validate quantity
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }
      
      // Validate ticket details
      if (!Array.isArray(ticketDetails) || ticketDetails.length !== quantity) {
        return res.status(400).json({
          success: false,
          message: 'Ticket details must match quantity'
        });
      }
      
      // Validate each ticket detail
      for (let i = 0; i < ticketDetails.length; i++) {
        const detail = ticketDetails[i];
        if (!detail.attendeeName || !detail.attendeeEmail) {
          return res.status(400).json({
            success: false,
            message: `Missing attendee name or email for ticket ${i + 1}`
          });
        }
      }
      
      // Find the event
      const event = await Event.findById(eventId).populate('organizer');
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if event is published and has capacity
      if (event.status !== 'published') {
        return res.status(400).json({
          success: false,
          message: 'Event is not available for ticket purchase'
        });
      }
      
      // Check if user is not the organizer
      if (req.user._id.toString() === event.organizer._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Organizers cannot purchase tickets for their own events'
        });
      }
      
      // Calculate total amount and fees
      const totalTicketPrice = ticketPrice * quantity;
      // Platform fee is included in the ticket price (10% of total)
      const platformFee = Math.round(totalTicketPrice * 0.10 * 100) / 100;
      const organizerPayment = totalTicketPrice - platformFee;
      const totalAmount = totalTicketPrice; // Total amount is the ticket price (platform fee included)
      
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          eventId: eventId,
          attendeeId: req.user._id.toString(),
          organizerId: event.organizer._id.toString(),
          ticketPrice: totalTicketPrice.toString(),
          platformFee: platformFee.toString(),
          organizerPayment: organizerPayment.toString(),
          quantity: quantity.toString()
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      // Create ticket record with multiple tickets
      const ticket = new Ticket({
        eventId: eventId,
        attendee: req.user._id,
        organizer: event.organizer._id,
        quantity: quantity,
        ticketDetails: ticketDetails.map((detail, index) => ({
          attendeeName: detail.attendeeName,
          attendeeEmail: detail.attendeeEmail,
          ticketNumber: index + 1
        })),
        ticketPrice: totalTicketPrice,
        currency: currency,
        platformFee: platformFee,
        organizerPayment: organizerPayment,
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: 'pending'
      });
      
      await ticket.save();
      
      res.status(200).json({
        success: true,
        message: 'Ticket purchase initiated',
        data: {
          ticketId: ticket._id,
          clientSecret: paymentIntent.client_secret,
          totalAmount: totalAmount,
          platformFee: platformFee,
          organizerPayment: organizerPayment,
          quantity: quantity
        }
      });
    } catch (error) {
      console.error('Create ticket purchase error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ticket purchase',
        error: error.message
      });
    }
  },
  
  /**
   * Confirm ticket payment
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  confirmTicketPayment: async (req, res) => {
    try {
      const { ticketId } = req.params;
      
      // Find the ticket
      const ticket = await Ticket.findById(ticketId)
        .populate('eventId')
        .populate('attendee')
        .populate('organizer');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }
      
      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(ticket.stripePaymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update ticket status
        ticket.paymentStatus = 'paid';
        await ticket.save();
        
        res.status(200).json({
          success: true,
          message: 'Ticket payment confirmed',
          data: {
            ticketId: ticket._id,
            paymentStatus: ticket.paymentStatus,
            totalAmount: ticket.ticketPrice + ticket.platformFee,
            quantity: ticket.quantity
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment not completed',
          data: {
            paymentStatus: paymentIntent.status
          }
        });
      }
    } catch (error) {
      console.error('Confirm ticket payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm ticket payment',
        error: error.message
      });
    }
  },
  
  /**
   * Request ticket refund
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  requestTicketRefund: async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { reason, refundTickets } = req.body; // refundTickets is array of ticket numbers to refund
      
      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Refund reason is required'
        });
      }
      
      // Find the ticket with populated event data
      const ticket = await Ticket.findById(ticketId)
        .populate('eventId')
        .populate('attendee');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }
      
      // Check if user can refund this ticket
      if (req.user._id.toString() !== ticket.attendee._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to refund this ticket'
        });
      }
      
      // Check if payment is completed
      if (ticket.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Only paid tickets can be refunded'
        });
      }
      
      // Check if event exists and get end date
      if (!ticket.eventId || typeof ticket.eventId === 'string') {
        return res.status(400).json({
          success: false,
          message: 'Event information not found'
        });
      }
      
      // Check if refund is possible (event must not be ended)
      const eventEndDate = new Date(ticket.eventId.endDate);
      const currentDate = new Date();
      
      if (eventEndDate <= currentDate) {
        return res.status(400).json({
          success: false,
          message: 'Refund is not possible after event end date'
        });
      }
      
      // Determine which tickets to refund
      let ticketsToRefund = [];
      if (refundTickets && Array.isArray(refundTickets) && refundTickets.length > 0) {
        // Partial refund - specific tickets
        ticketsToRefund = ticket.ticketDetails.filter(detail => 
          refundTickets.includes(detail.ticketNumber) && detail.refundStatus === 'none'
        );
      } else {
        // Full refund - all tickets
        ticketsToRefund = ticket.ticketDetails.filter(detail => detail.refundStatus === 'none');
      }
      
      if (ticketsToRefund.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No refundable tickets found'
        });
      }
      
      // Calculate refund amount
      const pricePerTicket = ticket.ticketPrice / ticket.quantity;
      const totalRefundAmount = ticketsToRefund.length * pricePerTicket;
      const cancellationFee = ticketsToRefund.length * 2.50; // 2.50 CHF per ticket
      const refundAmount = Math.max(0, totalRefundAmount - cancellationFee);
      
      // Update ticket refund status
      if (ticketsToRefund.length === ticket.quantity) {
        // Full refund
        ticket.refundStatus = 'requested';
        ticket.refundAmount = refundAmount;
        ticket.cancellationFee = cancellationFee;
        ticket.refundReason = reason.trim();
      } else {
        // Partial refund
        ticket.refundStatus = 'requested';
        ticket.refundAmount = refundAmount;
        ticket.cancellationFee = cancellationFee;
        ticket.refundReason = reason.trim();
        
        // Update individual ticket status
        ticketsToRefund.forEach(ticketDetail => {
          const detail = ticket.ticketDetails.find(d => d.ticketNumber === ticketDetail.ticketNumber);
          if (detail) {
            detail.refundStatus = 'requested';
            detail.refundAmount = pricePerTicket - 2.50; // Individual ticket refund amount
            detail.refundReason = reason.trim();
          }
        });
      }
      
      await ticket.save();
      
      res.status(200).json({
        success: true,
        message: 'Refund request submitted successfully',
        data: {
          ticketId: ticket._id,
          refundAmount: refundAmount,
          cancellationFee: cancellationFee,
          refundStatus: ticket.refundStatus,
          eventTitle: ticket.eventId.title,
          eventEndDate: ticket.eventId.endDate,
          quantity: ticketsToRefund.length,
          refundedTickets: ticketsToRefund.map(t => ({
            ticketNumber: t.ticketNumber,
            attendeeName: t.attendeeName,
            attendeeEmail: t.attendeeEmail
          }))
        }
      });
    } catch (error) {
      console.error('Request ticket refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to request ticket refund',
        error: error.message
      });
    }
  },
  
  /**
   * Process ticket refund (admin/organizer only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  processTicketRefund: async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { action, refundTickets } = req.body; // refundTickets is array of ticket numbers to refund
      
      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "approve" or "reject"'
        });
      }
      
      // Find the ticket with populated data
      const ticket = await Ticket.findById(ticketId)
        .populate('eventId')
        .populate('attendee')
        .populate('organizer');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }
      
      // Check if user can process this refund
      const isOrganizer = req.user._id.toString() === ticket.organizer._id.toString();
      const isAdmin = req.user.role === 'admin';
      
      if (!isOrganizer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to process this refund'
        });
      }
      
      // Check if refund is in requested state
      if (ticket.refundStatus !== 'requested') {
        return res.status(400).json({
          success: false,
          message: 'Refund is not in requested state'
        });
      }
      
      if (action === 'reject') {
        // Reject the refund
        ticket.refundStatus = 'rejected';
        
        // Reset individual ticket refund status
        ticket.ticketDetails.forEach(detail => {
          if (detail.refundStatus === 'requested') {
            detail.refundStatus = 'rejected';
          }
        });
        
        await ticket.save();
        
        res.status(200).json({
          success: true,
          message: 'Refund request rejected',
          data: {
            ticketId: ticket._id,
            refundStatus: ticket.refundStatus
          }
        });
      } else if (action === 'approve') {
        // Process the refund through Stripe
        try {
          // Create refund in Stripe
          const refund = await stripe.refunds.create({
            payment_intent: ticket.stripePaymentIntentId,
            amount: Math.round(ticket.refundAmount * 100), // Convert to cents
            metadata: {
              ticketId: ticket._id.toString(),
              refundType: 'ticket_cancellation',
              cancellationFee: ticket.cancellationFee.toString(),
              quantity: ticket.quantity.toString(),
              refundedTickets: JSON.stringify(refundTickets || [])
            }
          });
          
          // Update ticket status
          ticket.refundStatus = 'completed';
          ticket.refundedAt = new Date();
          
          // Update individual ticket status
          ticket.ticketDetails.forEach(detail => {
            if (detail.refundStatus === 'requested') {
              detail.refundStatus = 'completed';
              detail.refundedAt = new Date();
            }
          });
          
          // Update payment status based on refund amount
          if (ticket.refundAmount >= ticket.ticketPrice) {
            ticket.paymentStatus = 'refunded';
          } else {
            ticket.paymentStatus = 'partially_refunded';
          }
          
          await ticket.save();
          
          res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            data: {
              ticketId: ticket._id,
              refundAmount: ticket.refundAmount,
              cancellationFee: ticket.cancellationFee,
              refundStatus: ticket.refundStatus,
              stripeRefundId: refund.id,
              quantity: ticket.quantity
            }
          });
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          res.status(500).json({
            success: false,
            message: 'Failed to process refund through Stripe',
            error: stripeError.message
          });
        }
      }
    } catch (error) {
      console.error('Process ticket refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process ticket refund',
        error: error.message
      });
    }
  },
  
  /**
   * Transfer money to organizers for completed events
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  transferToOrganizers: async (req, res) => {
    try {
      // Find all paid tickets for completed events that haven't been transferred yet
      const pendingTransfers = await Ticket.find({
        paymentStatus: 'paid',
        organizerTransferStatus: 'pending'
      }).populate('eventId').populate('organizer');
      
      const completedEvents = pendingTransfers.filter(ticket => {
        return new Date(ticket.eventId.endDate) < new Date();
      });
      
      const transferResults = [];
      
      for (const ticket of completedEvents) {
        try {
          // Check if organizer has Stripe account
          if (!ticket.organizer.stripeCustomerId) {
            // Skip this ticket for now - organizer needs to set up Stripe
            transferResults.push({
              ticketId: ticket._id,
              status: 'skipped',
              reason: 'Organizer has no Stripe account'
            });
            continue;
          }
          
          // Create transfer to organizer
          const transfer = await stripe.transfers.create({
            amount: Math.round(ticket.organizerPayment * 100), // Convert to cents
            currency: ticket.currency.toLowerCase(),
            destination: ticket.organizer.stripeCustomerId,
            metadata: {
              ticketId: ticket._id.toString(),
              eventId: ticket.eventId._id.toString(),
              organizerId: ticket.organizer._id.toString()
            }
          });
          
          // Update ticket transfer status
          ticket.organizerTransferStatus = 'completed';
          ticket.stripeTransferId = transfer.id;
          ticket.organizerTransferDate = new Date();
          await ticket.save();
          
          transferResults.push({
            ticketId: ticket._id,
            status: 'completed',
            transferId: transfer.id,
            amount: ticket.organizerPayment
          });
          
        } catch (transferError) {
          console.error(`Transfer failed for ticket ${ticket._id}:`, transferError);
          
          // Mark transfer as failed
          ticket.organizerTransferStatus = 'failed';
          await ticket.save();
          
          transferResults.push({
            ticketId: ticket._id,
            status: 'failed',
            error: transferError.message
          });
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Transfer process completed',
        data: {
          totalProcessed: completedEvents.length,
          results: transferResults
        }
      });
    } catch (error) {
      console.error('Transfer to organizers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process transfers',
        error: error.message
      });
    }
  },
  
  /**
   * Get user's tickets
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getUserTickets: async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      
      const filter = { attendee: req.user._id };
      if (status) {
        filter.paymentStatus = status;
      }
      
      const skip = (page - 1) * limit;
      
      const tickets = await Ticket.find(filter)
        .populate('eventId')
        .populate('organizer', 'firstName lastName email')
        .sort({ purchasedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Ticket.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        message: 'Tickets retrieved successfully',
        data: {
          tickets,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get user tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tickets',
        error: error.message
      });
    }
  },
  
  /**
   * Get organizer's ticket sales
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getOrganizerTickets: async (req, res) => {
    try {
      const { status, eventId, page = 1, limit = 10 } = req.query;
      
      const filter = { organizer: req.user._id };
      if (status) {
        filter.paymentStatus = status;
      }
      if (eventId) {
        filter.eventId = eventId;
      }
      
      const skip = (page - 1) * limit;
      
      const tickets = await Ticket.find(filter)
        .populate('eventId')
        .populate('attendee', 'firstName lastName email')
        .sort({ purchasedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Ticket.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        message: 'Organizer tickets retrieved successfully',
        data: {
          tickets,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get organizer tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve organizer tickets',
        error: error.message
      });
    }
  },

  /**
   * Get all refund requests (admin only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getAllRefundRequests: async (req, res) => {
    try {
      // Only admin can access
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      // Find all tickets with refund requested
      const tickets = await Ticket.find({
        refundStatus: 'requested'
      })
        .populate('eventId')
        .populate('attendee', 'firstName lastName email')
        .populate('organizer', 'firstName lastName email')
        .sort({ updatedAt: -1 });
      
      res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Get all refund requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get refund requests',
        error: error.message
      });
    }
  },

  /**
   * Get organizer's refund requests (organizer only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getOrganizerRefundRequests: async (req, res) => {
    try {
      // Only organizer or admin can access
      if (!req.user || (req.user.role !== 'organizer' && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Organizer access required'
        });
      }
      
      // Find all tickets for this organizer with refund requested
      const tickets = await Ticket.find({
        organizer: req.user._id,
        refundStatus: 'requested'
      })
        .populate('eventId')
        .populate('attendee', 'firstName lastName email')
        .sort({ updatedAt: -1 });
      
      res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Get organizer refund requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get refund requests',
        error: error.message
      });
    }
  }
};

module.exports = ticketController; 