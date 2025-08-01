const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Ticket = require('../models/ticket');
const Event = require('../models/event');
const User = require('../models/user');
const emailService = require('../utils/email');
const { userNotifications: userNotificationsTemplate } = require('../utils/email-templates');

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
      // Platform fee is 10% per ticket, then multiplied by quantity
      const platformFeePerTicket = Math.round(ticketPrice * 0.10 * 100) / 100;
      const platformFee = platformFeePerTicket * quantity;
      const organizerPaymentPerTicket = ticketPrice - platformFeePerTicket;
      const organizerPayment = organizerPaymentPerTicket * quantity;
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
      
      // Generate unique ticket numbers for this event
      let ticketNumbers;
      try {
        ticketNumbers = await Ticket.generateTicketNumbers(eventId, event.title, quantity);
      } catch (error) {
        console.error('Error generating ticket numbers:', error);
        // Fallback: generate simple ticket numbers
        ticketNumbers = [];
        for (let i = 0; i < quantity; i++) {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          ticketNumbers.push(`tk_${timestamp}_${random}_${i}`);
        }
      }
      
      // Create ticket record with multiple tickets
      const ticket = new Ticket({
        eventId: eventId,
        attendee: req.user._id,
        organizer: event.organizer._id,
        quantity: quantity,
        ticketDetails: ticketDetails.map((detail, index) => ({
          attendeeName: detail.attendeeName,
          attendeeEmail: detail.attendeeEmail,
          ticketNumber: ticketNumbers[index] || `tk_${Date.now()}_${index}`
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
   * Add tickets to existing purchase
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addTicketsToExistingPurchase: async (req, res) => {
    try {
      const { existingTicketId, additionalQuantity, additionalTicketDetails } = req.body;
      
      if (!existingTicketId || !additionalQuantity || !additionalTicketDetails) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Validate additional quantity
      if (additionalQuantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Additional quantity must be at least 1'
        });
      }
      
      // Validate additional ticket details
      if (!Array.isArray(additionalTicketDetails) || additionalTicketDetails.length !== additionalQuantity) {
        return res.status(400).json({
          success: false,
          message: 'Additional ticket details must match quantity'
        });
      }
      
      // Validate each additional ticket detail
      for (let i = 0; i < additionalTicketDetails.length; i++) {
        const detail = additionalTicketDetails[i];
        if (!detail.attendeeName || !detail.attendeeEmail) {
          return res.status(400).json({
            success: false,
            message: `Missing attendee name or email for additional ticket ${i + 1}`
          });
        }
      }
      
      // Find the existing ticket
      const existingTicket = await Ticket.findById(existingTicketId)
        .populate('eventId')
        .populate('organizer');
      
      if (!existingTicket) {
        return res.status(404).json({
          success: false,
          message: 'Existing ticket not found'
        });
      }
      
      // Check if user owns this ticket
      if (req.user._id.toString() !== existingTicket.attendee.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify this ticket'
        });
      }
      
      // Check if existing ticket is paid
      if (existingTicket.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Can only add tickets to paid purchases'
        });
      }
      
      // Get event price
      const event = existingTicket.eventId;
      const ticketPrice = event.price.isFree ? 0 : event.price.amount;
      
      // Calculate additional amount and fees
      const additionalTicketPrice = ticketPrice * additionalQuantity;
      const additionalPlatformFeePerTicket = Math.round(ticketPrice * 0.10 * 100) / 100;
      const additionalPlatformFee = additionalPlatformFeePerTicket * additionalQuantity;
      const additionalOrganizerPaymentPerTicket = ticketPrice - additionalPlatformFeePerTicket;
      const additionalOrganizerPayment = additionalOrganizerPaymentPerTicket * additionalQuantity;
      const additionalTotalAmount = additionalTicketPrice;
      
      // Create Stripe payment intent for additional tickets
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(additionalTotalAmount * 100), // Convert to cents
        currency: existingTicket.currency.toLowerCase(),
        metadata: {
          eventId: event._id.toString(),
          attendeeId: req.user._id.toString(),
          organizerId: existingTicket.organizer._id.toString(),
          existingTicketId: existingTicketId,
          additionalTicketPrice: additionalTicketPrice.toString(),
          additionalPlatformFee: additionalPlatformFee.toString(),
          additionalOrganizerPayment: additionalOrganizerPayment.toString(),
          additionalQuantity: additionalQuantity.toString(),
          isAdditionalPurchase: 'true'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      res.status(200).json({
        success: true,
        message: 'Additional ticket purchase initiated',
        data: {
          existingTicketId: existingTicket._id,
          clientSecret: paymentIntent.client_secret,
          additionalTotalAmount: additionalTotalAmount,
          additionalPlatformFee: additionalPlatformFee,
          additionalOrganizerPayment: additionalOrganizerPayment,
          additionalQuantity: additionalQuantity,
          paymentIntentId: paymentIntent.id
        }
      });
    } catch (error) {
      console.error('Add tickets to existing purchase error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add tickets to existing purchase',
        error: error.message
      });
    }
  },

  /**
   * Confirm additional ticket payment and merge with existing ticket
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  confirmAdditionalTicketPayment: async (req, res) => {
    try {
      const { existingTicketId, paymentIntentId, additionalTicketDetails } = req.body;
      
      if (!existingTicketId || !paymentIntentId || !additionalTicketDetails) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Find the existing ticket
      const existingTicket = await Ticket.findById(existingTicketId)
        .populate('eventId')
        .populate('organizer');
      
      if (!existingTicket) {
        return res.status(404).json({
          success: false,
          message: 'Existing ticket not found'
        });
      }
      
      // Check if user owns this ticket
      if (req.user._id.toString() !== existingTicket.attendee.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify this ticket'
        });
      }
      
      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Get event price
        const event = existingTicket.eventId;
        const ticketPrice = event.price.isFree ? 0 : event.price.amount;
        const additionalQuantity = additionalTicketDetails.length;
        
        // Calculate additional amounts
        const additionalTicketPrice = ticketPrice * additionalQuantity;
        const additionalPlatformFeePerTicket = Math.round(ticketPrice * 0.10 * 100) / 100;
        const additionalPlatformFee = additionalPlatformFeePerTicket * additionalQuantity;
        const additionalOrganizerPaymentPerTicket = ticketPrice - additionalPlatformFeePerTicket;
        const additionalOrganizerPayment = additionalOrganizerPaymentPerTicket * additionalQuantity;
        
        // Update existing ticket with additional tickets
        const currentQuantity = existingTicket.quantity;
        const newQuantity = currentQuantity + additionalQuantity;
        
        // Generate unique ticket numbers for additional tickets
        const additionalTicketNumbers = await Ticket.generateTicketNumbers(event._id, event.title, additionalQuantity);
        
        // Add additional ticket details with correct ticket numbers
        const additionalDetails = additionalTicketDetails.map((detail, index) => ({
          attendeeName: detail.attendeeName,
          attendeeEmail: detail.attendeeEmail,
          ticketNumber: additionalTicketNumbers[index]
        }));
        
        // Update existing ticket
        existingTicket.quantity = newQuantity;
        existingTicket.ticketDetails = [...existingTicket.ticketDetails, ...additionalDetails];
        existingTicket.ticketPrice += additionalTicketPrice;
        existingTicket.platformFee += additionalPlatformFee;
        existingTicket.organizerPayment += additionalOrganizerPayment;
        
        await existingTicket.save();
        
        res.status(200).json({
          success: true,
          message: 'Additional tickets added successfully',
          data: {
            ticketId: existingTicket._id,
            totalQuantity: newQuantity,
            additionalQuantity: additionalQuantity,
            totalAmount: existingTicket.ticketPrice + existingTicket.platformFee
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
      console.error('Confirm additional ticket payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm additional ticket payment',
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
        
        // Send ticket purchase confirmation email
        try {
          const attendee = await User.findById(ticket.attendee);
          const event = await Event.findById(ticket.eventId);
          
          if (attendee && event) {
            const ticketPurchaseEmailHtml = userNotificationsTemplate.generateTicketPurchaseEmail({
              userName: attendee.firstName,
              eventTitle: event.title,
              eventDate: event.startDate,
              eventLocation: event.location.name,
              quantity: ticket.quantity,
              totalAmount: ticket.ticketPrice,
              currency: ticket.currency,
              ticketDetails: ticket.ticketDetails,
              eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            });
            const ticketPurchaseEmailText = userNotificationsTemplate.generateTicketPurchaseText({
              userName: attendee.firstName,
              eventTitle: event.title,
              eventDate: event.startDate,
              eventLocation: event.location.name,
              quantity: ticket.quantity,
              totalAmount: ticket.ticketPrice,
              currency: ticket.currency,
              ticketDetails: ticket.ticketDetails,
              eventUrl: `${process.env.FRONTEND_URL}/events/${event.slug}`
            });

            await emailService.sendEmail({
              to: attendee.email,
              subject: 'Ticket Purchase Confirmation - Zafo',
              html: ticketPurchaseEmailHtml,
              text: ticketPurchaseEmailText
            });

            console.log(`Ticket purchase confirmation email sent to ${attendee.email}`);
          }
        } catch (emailError) {
          console.error('Failed to send ticket purchase confirmation email:', emailError);
          // Don't fail payment confirmation if email fails
        }
        
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
        // Filter out null/undefined values first
        const validRefundTickets = refundTickets.filter(num => num !== null && num !== undefined);
        
        console.log('Refund request debug:', {
          refundTickets,
          validRefundTickets,
          ticketDetails: ticket.ticketDetails.map(d => ({ ticketNumber: d.ticketNumber, refundStatus: d.refundStatus }))
        });
        
        ticketsToRefund = ticket.ticketDetails.filter(detail => 
          validRefundTickets.includes(detail.ticketNumber) && detail.refundStatus === 'none'
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
      
      // Send refund request confirmation email
      try {
        const attendee = await User.findById(ticket.attendee);
        
        if (attendee) {
          const refundRequestEmailHtml = userNotificationsTemplate.generateRefundRequestEmail({
            userName: attendee.firstName,
            eventTitle: ticket.eventId.title,
            eventDate: ticket.eventId.startDate,
            quantity: ticketsToRefund.length,
            refundAmount: refundAmount,
            currency: ticket.currency,
            reason: reason.trim(),
            refundedTickets: ticketsToRefund.map(t => ({
              ticketNumber: t.ticketNumber,
              attendeeName: t.attendeeName,
              attendeeEmail: t.attendeeEmail
            }))
          });
          const refundRequestEmailText = userNotificationsTemplate.generateRefundRequestText({
            userName: attendee.firstName,
            eventTitle: ticket.eventId.title,
            eventDate: ticket.eventId.startDate,
            quantity: ticketsToRefund.length,
            refundAmount: refundAmount,
            currency: ticket.currency,
            reason: reason.trim(),
            refundedTickets: ticketsToRefund.map(t => ({
              ticketNumber: t.ticketNumber,
              attendeeName: t.attendeeName,
              attendeeEmail: t.attendeeEmail
            }))
          });

          await emailService.sendEmail({
            to: attendee.email,
            subject: 'Refund Request Submitted - Zafo',
            html: refundRequestEmailHtml,
            text: refundRequestEmailText
          });

          console.log(`Refund request confirmation email sent to ${attendee.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send refund request confirmation email:', emailError);
        // Don't fail refund request if email fails
      }
      
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


          console.log(refundTickets);
          // Update quantity to reflect removed tickets
          const removedQuantity = refundTickets.length;
          ticket.quantity = Math.max(0, ticket.quantity - removedQuantity);
          
          // Recalculate ticket price, platform fee, and organizer payment based on remaining quantity
          const originalPricePerTicket = ticket.ticketPrice / (ticket.quantity + removedQuantity);
          const remainingQuantity = ticket.quantity;
          
          // Update ticket amounts based on remaining quantity
          ticket.ticketPrice = originalPricePerTicket * remainingQuantity;
          const platformFeePerTicket = Math.round(originalPricePerTicket * 0.10 * 100) / 100;
          ticket.platformFee = platformFeePerTicket * remainingQuantity;
          const organizerPaymentPerTicket = originalPricePerTicket - platformFeePerTicket;
          ticket.organizerPayment = organizerPaymentPerTicket * remainingQuantity;
          
          // Update payment status based on refund amount
          if (ticket.refundAmount >= ticket.ticketPrice || ticket.quantity === 0) {
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
  },

  /**
   * Get user's comprehensive reports and statistics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * 
   * IMPORTANT: This method counts individual attendee tickets, not ticket records.
   * A single ticket record can contain multiple individual attendee tickets (ticketDetails).
   * For partially refunded tickets, we count only the non-refunded individual tickets.
   */
  getUserReports: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Get all user's tickets with populated data
      const tickets = await Ticket.find({ attendee: userId })
        .populate('eventId')
        .populate('organizer', 'firstName lastName email')
        .sort({ purchasedAt: -1 });
      
      // Calculate basic statistics - count individual attendee tickets, not ticket records
      const totalAttendeeTickets = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
      const totalSpent = tickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0);
      const totalEvents = new Set(tickets.map(ticket => 
        typeof ticket.eventId === 'object' ? ticket.eventId._id.toString() : ticket.eventId
      )).size;
      
      // Calculate individual attendee tickets by status
      // We need to count individual ticket details, not ticket records
      const ticketsByStatus = {
        paid: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
        partially_refunded: 0
      };
      
      // Count individual attendee tickets by status
      tickets.forEach(ticket => {
        if (ticket.paymentStatus === 'paid') {
          // Count only non-refunded individual tickets
          const nonRefundedTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          ticketsByStatus.paid += nonRefundedTickets;
        } else if (ticket.paymentStatus === 'pending') {
          ticketsByStatus.pending += ticket.quantity;
        } else if (ticket.paymentStatus === 'failed') {
          ticketsByStatus.failed += ticket.quantity;
        } else if (ticket.paymentStatus === 'refunded') {
          // All tickets in this record are refunded
          ticketsByStatus.refunded += ticket.quantity;
        } else if (ticket.paymentStatus === 'partially_refunded') {
          // Count individual tickets that are refunded
          const refundedTickets = ticket.ticketDetails.filter(detail => detail.refundStatus === 'completed').length;
          const nonRefundedTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          
          // Add to partially refunded count (tickets that are still active)
          ticketsByStatus.partially_refunded += nonRefundedTickets;
          // Add refunded individual tickets to refunded count
          ticketsByStatus.refunded += refundedTickets;
        }
      });
      
      // Calculate refund statistics
      // Count individual attendee tickets that have been refunded
      const refundRequests = tickets.reduce((sum, ticket) => {
        // Count individual tickets that have refund status 'completed'
        const refundedIndividualTickets = ticket.ticketDetails.filter(detail => detail.refundStatus === 'completed').length;
        return sum + refundedIndividualTickets;
      }, 0);
      
      // Calculate total refunded amount from individual ticket refunds
      const refundedAmount = tickets.reduce((sum, ticket) => {
        // Sum up refund amounts from individual ticket details
        const individualRefundAmount = ticket.ticketDetails
          .filter(detail => detail.refundStatus === 'completed')
          .reduce((detailSum, detail) => detailSum + (detail.refundAmount || 0), 0);
        return sum + individualRefundAmount;
      }, 0);
      
      // Calculate monthly spending for the last 12 months
      const monthlySpending = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        
        const monthTickets = tickets.filter(ticket => {
          const ticketDate = new Date(ticket.purchasedAt);
          return ticketDate.getFullYear() === month.getFullYear() && 
                 ticketDate.getMonth() === month.getMonth() &&
                 (ticket.paymentStatus === 'paid' || ticket.paymentStatus === 'partially_refunded');
        });
        
        const monthSpending = monthTickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0);
        // Count individual attendee tickets for the month
        const monthTicketsCount = monthTickets.reduce((sum, ticket) => {
          if (ticket.paymentStatus === 'paid') {
            // Count only non-refunded individual tickets
            return sum + ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          } else if (ticket.paymentStatus === 'partially_refunded') {
            // Count only non-refunded individual tickets
            return sum + ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          }
          return sum + ticket.quantity;
        }, 0);
        
        monthlySpending.push({
          month: monthKey,
          spending: monthSpending,
          tickets: monthTicketsCount
        });
      }
      
      // Calculate category preferences - count individual attendee tickets
      const categoryStats = {};
      tickets.forEach(ticket => {
        if (typeof ticket.eventId === 'object' && ticket.eventId.category) {
          const category = ticket.eventId.category;
          if (!categoryStats[category]) {
            categoryStats[category] = {
              count: 0,
              spending: 0,
              events: new Set()
            };
          }
          
          // Count individual attendee tickets based on payment status
          let individualTicketCount = 0;
          if (ticket.paymentStatus === 'paid') {
            individualTicketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          } else if (ticket.paymentStatus === 'partially_refunded') {
            individualTicketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          } else if (ticket.paymentStatus === 'refunded') {
            individualTicketCount = 0; // All tickets refunded
          } else {
            individualTicketCount = ticket.quantity; // pending, failed, etc.
          }
          
          categoryStats[category].count += individualTicketCount;
          categoryStats[category].spending += ticket.ticketPrice;
          categoryStats[category].events.add(ticket.eventId._id.toString());
        }
      });
      
      // Convert category stats to array format
      const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        tickets: stats.count,
        spending: stats.spending,
        events: stats.events.size
      })).sort((a, b) => b.spending - a.spending);
      
      // Get recent activity (last 10 tickets)
      const recentActivity = tickets.slice(0, 10).map(ticket => {
        // Calculate actual individual ticket count for this record
        let actualTicketCount = 0;
        if (ticket.paymentStatus === 'paid') {
          actualTicketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
        } else if (ticket.paymentStatus === 'partially_refunded') {
          actualTicketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
        } else if (ticket.paymentStatus === 'refunded') {
          actualTicketCount = 0;
        } else {
          actualTicketCount = ticket.quantity;
        }
        
        return {
          ticketId: ticket._id,
          eventTitle: typeof ticket.eventId === 'object' ? ticket.eventId.title : 'Unknown Event',
          eventDate: typeof ticket.eventId === 'object' ? ticket.eventId.startDate : null,
          quantity: actualTicketCount,
          amount: ticket.ticketPrice,
          currency: ticket.currency,
          paymentStatus: ticket.paymentStatus,
          purchasedAt: ticket.purchasedAt,
          organizer: typeof ticket.organizer === 'object' ? 
            `${ticket.organizer.firstName} ${ticket.organizer.lastName}` : 'Unknown Organizer'
        };
      });
      
      // Calculate average ticket price - based on individual attendee tickets
      const paidTickets = tickets.filter(t => t.paymentStatus === 'paid' || t.paymentStatus === 'partially_refunded');
      const totalPaidIndividualTickets = paidTickets.reduce((sum, ticket) => {
        return sum + ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
      }, 0);
      
      const totalPaidAmount = paidTickets.reduce((sum, ticket) => sum + ticket.ticketPrice, 0);
      const averageTicketPrice = totalPaidIndividualTickets > 0 ? 
        totalPaidAmount / totalPaidIndividualTickets : 0;
      
      // Get favorite organizers (by spending) - count individual attendee tickets
      const organizerStats = {};
      tickets.forEach(ticket => {
        if (typeof ticket.organizer === 'object') {
          const organizerId = ticket.organizer._id.toString();
          const organizerName = `${ticket.organizer.firstName} ${ticket.organizer.lastName}`;
          
          if (!organizerStats[organizerId]) {
            organizerStats[organizerId] = {
              name: organizerName,
              tickets: 0,
              spending: 0,
              events: new Set()
            };
          }
          
          // Count individual attendee tickets
          let individualTicketCount = 0;
          if (ticket.paymentStatus === 'paid') {
            individualTicketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          } else if (ticket.paymentStatus === 'partially_refunded') {
            individualTicketCount = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
          } else if (ticket.paymentStatus === 'refunded') {
            individualTicketCount = 0;
          } else {
            individualTicketCount = ticket.quantity;
          }
          
          organizerStats[organizerId].tickets += individualTicketCount;
          organizerStats[organizerId].spending += ticket.ticketPrice;
          if (typeof ticket.eventId === 'object') {
            organizerStats[organizerId].events.add(ticket.eventId._id.toString());
          }
        }
      });
      
      const favoriteOrganizers = Object.entries(organizerStats)
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          tickets: stats.tickets,
          spending: stats.spending,
          events: stats.events.size
        }))
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 5);
      
      // Calculate success rate (attended vs missed events) - count individual attendee tickets
      const attendedEvents = tickets.filter(ticket => {
        if (typeof ticket.eventId === 'object') {
          const eventDate = new Date(ticket.eventId.endDate);
          return eventDate < now && (ticket.paymentStatus === 'paid' || ticket.paymentStatus === 'partially_refunded');
        }
        return false;
      });
      
      const upcomingEvents = tickets.filter(ticket => {
        if (typeof ticket.eventId === 'object') {
          const eventDate = new Date(ticket.eventId.startDate);
          return eventDate > now && (ticket.paymentStatus === 'paid' || ticket.paymentStatus === 'partially_refunded');
        }
        return false;
      });
      
      // Count individual attendee tickets for events
      const attendedIndividualTickets = attendedEvents.reduce((sum, ticket) => {
        return sum + ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
      }, 0);
      
      const upcomingIndividualTickets = upcomingEvents.reduce((sum, ticket) => {
        return sum + ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
      }, 0);
      
      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalTickets: totalAttendeeTickets, // Now correctly counts individual attendee tickets
            totalSpent,
            totalEvents,
            averageTicketPrice,
            refundedAmount,
            refundRequests
          },
          ticketsByStatus, // Now correctly counts individual attendee tickets by status
          monthlySpending,
          categoryBreakdown,
          recentActivity,
          favoriteOrganizers,
          events: {
            attended: attendedIndividualTickets, // Count individual tickets, not events
            upcoming: upcomingIndividualTickets, // Count individual tickets, not events
            total: totalEvents
          }
        }
      });
    } catch (error) {
      console.error('Get user reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user reports',
        error: error.message
      });
    }
  }
};

module.exports = ticketController; 