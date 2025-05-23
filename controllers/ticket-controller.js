const mongoose = require('mongoose');
const Ticket = require('../models/ticket');
const Event = require('../models/event');
const User = require('../models/user');
const { 
  createCustomer, 
  createTicketPaymentIntent, 
  retrievePaymentIntent, 
  createEphemeralKey,
  stripe  // Import the direct Stripe instance
} = require('../utils/stripe');
const { generateTicketPDF } = require('../utils/ticket-generator');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique ticket number
 * @returns {String} Unique ticket number
 */
const generateUniqueTicketNumber = () => {
  return `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
};

/**
 * Ensures ticket numbers are unique by verifying against the database
 * @param {Array} ticketNumbers - Array of ticket numbers to check
 * @returns {Promise<Object>} Result with status and any duplicate numbers
 */
const ensureUniqueTicketNumbers = async (ticketNumbers) => {
  try {
    // Find any existing tickets with these numbers
    const existingTickets = await Ticket.find({
      'tickets.ticketNumber': { $in: ticketNumbers }
    });
    
    if (existingTickets.length === 0) {
      // All numbers are unique
      return { isUnique: true, duplicates: [] };
    }
    
    // Collect all duplicate ticket numbers
    const duplicateNumbers = [];
    existingTickets.forEach(order => {
      order.tickets.forEach(ticket => {
        if (ticketNumbers.includes(ticket.ticketNumber)) {
          duplicateNumbers.push(ticket.ticketNumber);
        }
      });
    });
    
    return { isUnique: false, duplicates: duplicateNumbers };
  } catch (error) {
    console.error('Error checking ticket uniqueness:', error);
    throw new Error('Failed to check ticket uniqueness');
  }
};

/**
 * Creates individual ticket objects for a ticket order
 * @param {Number} quantity - Number of tickets to create
 * @param {Number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Array>} Array of ticket objects with unique ticket numbers
 */
const createTickets = async (quantity, maxRetries = 3) => {
  if (maxRetries <= 0) {
    throw new Error('Failed to generate unique ticket numbers after multiple attempts');
  }
  
  const tickets = [];
  const ticketNumbers = [];
  
  // Generate initial ticket numbers
  for (let i = 0; i < quantity; i++) {
    const ticketNumber = generateUniqueTicketNumber();
    ticketNumbers.push(ticketNumber);
    tickets.push({ ticketNumber });
  }
  
  try {
    // Check if all generated numbers are unique in the database
    const { isUnique, duplicates } = await ensureUniqueTicketNumbers(ticketNumbers);
    
    if (isUnique) {
      return tickets;
    }
    
    // Some duplicates found, regenerate only the duplicate numbers
    console.log(`Found ${duplicates.length} duplicate ticket numbers. Regenerating...`);
    
    // Retry with a new set of tickets
    return createTickets(quantity, maxRetries - 1);
  } catch (error) {
    console.error('Error in createTickets:', error);
    throw new Error('Failed to create tickets with unique numbers');
  }
};

/**
 * Ticket Controller
 * Handles all ticket-related operations
 */
const ticketController = {
  /**
   * Initiate ticket purchase
   * Creates a payment intent for the ticket purchase
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  initiateTicketPurchase: async (req, res) => {
    try {
      const { eventId, quantity } = req.body;
      
      if (!eventId || !quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and quantity are required. Quantity must be at least 1.'
        });
      }
      
      // Get event details
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if event is published and available for ticket purchases
      if (event.status !== 'published') {
        return res.status(400).json({
          success: false,
          message: 'Tickets cannot be purchased for this event at this time'
        });
      }
      
      // Check if tickets are available (compare against capacity)
      const soldTickets = await Ticket.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(eventId) } },
        { $group: { _id: null, totalSold: { $sum: '$quantity' } } }
      ]);
      
      const totalSold = soldTickets.length > 0 ? soldTickets[0].totalSold : 0;
      const remainingCapacity = event.capacity - totalSold;
      
      if (remainingCapacity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${remainingCapacity} tickets available for this event`
        });
      }
      
      // Calculate ticket price
      const ticketPrice = event.price.isFree ? 0 : event.price.amount;
      const totalAmount = ticketPrice * quantity;
      const currency = event.price.currency.toLowerCase();
      
      // Convert amount to cents for Stripe (Stripe requires amounts in smallest currency unit)
      const amountInCents = Math.round(totalAmount * 100);
      
      // Check if user has a Stripe customer ID
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        // Create a Stripe customer if one doesn't exist
        const customer = await createCustomer(req.user);
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await User.findByIdAndUpdate(req.user._id, {
          stripeCustomerId: customerId
        });
      }
      
      // Create a payment intent for the ticket purchase
      const paymentIntent = await createTicketPaymentIntent(
        amountInCents,
        currency,
        customerId,
        {
          event_id: eventId,
          event_title: event.title,
          user_id: req.user._id.toString(),
          email: req.user.email,
          quantity: quantity.toString(),
          description: `${quantity} ticket(s) for ${event.title}`
        }
      );
      
      // Create ephemeral key for the customer
      const ephemeralKey = await createEphemeralKey(customerId);
      
      // Generate unique ticket objects
      let tickets;
      try {
        tickets = await createTickets(quantity);
        console.log(`Successfully generated ${tickets.length} unique ticket numbers`);
      } catch (ticketError) {
        console.error('Error generating tickets:', ticketError);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique tickets. Please try again later.',
          error: ticketError.message
        });
      }
      
      // Create a pending ticket order
      const ticketOrder = new Ticket({
        event: eventId,
        user: req.user._id,
        quantity,
        tickets,
        amount: totalAmount,
        currency,
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'pending'
      });
      
      try {
        await ticketOrder.save();
      } catch (saveError) {
        console.error('Error saving ticket order:', saveError);
        
        // Clean up the payment intent if we can't save the ticket order
        try {
          await stripe.paymentIntents.cancel(paymentIntent.id);
        } catch (cancelError) {
          console.error('Error canceling payment intent:', cancelError);
        }
        
        return res.status(500).json({
          success: false,
          message: 'Failed to create ticket order. Please try again later.',
          error: saveError.message
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        data: {
          clientSecret: paymentIntent.client_secret,
          ephemeralKey: ephemeralKey.secret,
          customerId,
          paymentIntentId: paymentIntent.id,
          amount: totalAmount,
          currency,
          ticketOrderId: ticketOrder._id
        }
      });
    } catch (error) {
      console.error('Initiate ticket purchase error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate ticket purchase',
        error: error.message
      });
    }
  },
  
  /**
   * Complete ticket purchase
   * Confirms payment and generates PDF tickets
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  completeTicketPurchase: async (req, res) => {
    try {
      const { paymentIntentId, ticketOrderId, attendeeInfo } = req.body;
      
      if (!paymentIntentId || !ticketOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Payment intent ID and ticket order ID are required'
        });
      }
      
      // Find the ticket order
      const ticketOrder = await Ticket.findById(ticketOrderId);
      if (!ticketOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ticket order not found'
        });
      }
      
      // Verify that the payment intent matches the ticket order
      if (ticketOrder.paymentIntentId !== paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment intent does not match the ticket order'
        });
      }
      
      // Verify that the user is the owner of the ticket order
      if (ticketOrder.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to complete this ticket purchase'
        });
      }
      
      // Retrieve the payment intent from Stripe to check its status
      const paymentIntent = await retrievePaymentIntent(paymentIntentId);
      
      // Update ticket order with payment status
      ticketOrder.paymentStatus = paymentIntent.status;
      
      // Update attendee information if provided
      if (attendeeInfo && Array.isArray(attendeeInfo) && attendeeInfo.length > 0) {
        // Only update as many tickets as we have attendee info for
        const maxLength = Math.min(attendeeInfo.length, ticketOrder.tickets.length);
        
        for (let i = 0; i < maxLength; i++) {
          if (attendeeInfo[i]) {
            if (attendeeInfo[i].name) {
              ticketOrder.tickets[i].attendeeName = attendeeInfo[i].name;
            }
            if (attendeeInfo[i].email) {
              ticketOrder.tickets[i].attendeeEmail = attendeeInfo[i].email;
            }
          }
        }
      }
      
      await ticketOrder.save();
      
      // If payment is successful, generate PDF tickets
      if (paymentIntent.status === 'succeeded') {
        try {
          // Get event and user details for PDF generation
          const event = await Event.findById(ticketOrder.event);
          const user = await User.findById(ticketOrder.user);
          
          // Generate PDF tickets
          const ticketPdf = await generateTicketPDF(ticketOrder, event, user);
          
          // Update ticket order with PDF URL
          ticketOrder.pdfUrl = ticketPdf.url;
          await ticketOrder.save();
          
          // Send success response with PDF URL
          res.status(200).json({
            success: true,
            message: 'Ticket purchase completed successfully',
            data: {
              ticketOrder,
              pdfUrl: ticketPdf.url
            }
          });
        } catch (pdfError) {
          console.error('Error generating PDF tickets:', pdfError);
          
          // Still return success but with error about PDF generation
          res.status(200).json({
            success: true,
            message: 'Payment successful but could not generate tickets. Please contact support.',
            data: {
              ticketOrder,
              pdfError: pdfError.message
            }
          });
        }
      } else if (paymentIntent.status === 'processing') {
        // Payment is still processing
        res.status(200).json({
          success: true,
          message: 'Payment is processing. Tickets will be generated once payment is complete.',
          data: {
            ticketOrder,
            paymentStatus: paymentIntent.status
          }
        });
      } else {
        // Payment failed or was canceled
        res.status(400).json({
          success: false,
          message: `Payment ${paymentIntent.status}. Please try again or contact support.`,
          data: {
            ticketOrder,
            paymentStatus: paymentIntent.status
          }
        });
      }
    } catch (error) {
      console.error('Complete ticket purchase error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete ticket purchase',
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
      const { status, limit = 10, page = 1, sort = '-createdAt' } = req.query;
      
      // Build filter object
      const filter = { user: req.user._id };
      
      // Add payment status filter if provided
      if (status) {
        filter.paymentStatus = status;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Execute query with pagination and sorting
      const tickets = await Ticket.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('event', 'title startDate endDate location status coverImage slug');
      
      // Get total count for pagination
      const total = await Ticket.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        message: 'User tickets retrieved successfully',
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
        message: 'Failed to retrieve user tickets',
        error: error.message
      });
    }
  },
  
  /**
   * Get ticket order by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getTicketById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Find the ticket order
      const ticketOrder = await Ticket.findById(id)
        .populate('event', 'title startDate endDate location status coverImage slug')
        .populate('user', 'firstName lastName email');
      
      if (!ticketOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ticket order not found'
        });
      }
      
      // Check if user has permission to view this ticket
      if (ticketOrder.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this ticket'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Ticket order retrieved successfully',
        data: ticketOrder
      });
    } catch (error) {
      console.error('Get ticket by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve ticket order',
        error: error.message
      });
    }
  },
  
  /**
   * Validate a ticket (for event check-in)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateTicket: async (req, res) => {
    try {
      const { ticketNumber, eventId } = req.body;
      
      if (!ticketNumber || !eventId) {
        return res.status(400).json({
          success: false,
          message: 'Ticket number and event ID are required'
        });
      }
      
      // Find ticket order that contains this ticket
      const ticketOrder = await Ticket.findOne({
        event: eventId,
        'tickets.ticketNumber': ticketNumber,
        paymentStatus: 'succeeded'
      });
      
      if (!ticketOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found or payment not completed'
        });
      }
      
      // Find the specific ticket in the order
      const ticketIndex = ticketOrder.tickets.findIndex(
        ticket => ticket.ticketNumber === ticketNumber
      );
      
      if (ticketIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found in order'
        });
      }
      
      const ticket = ticketOrder.tickets[ticketIndex];
      
      // Check if ticket is already checked in
      if (ticket.isCheckedIn) {
        return res.status(400).json({
          success: false,
          message: 'Ticket has already been used for check-in'
        });
      }
      
      // Mark ticket as checked in
      ticketOrder.tickets[ticketIndex].isCheckedIn = true;
      ticketOrder.tickets[ticketIndex].checkedInAt = new Date();
      
      await ticketOrder.save();
      
      res.status(200).json({
        success: true,
        message: 'Ticket validated and checked in successfully',
        data: {
          ticketNumber,
          checkedInAt: ticketOrder.tickets[ticketIndex].checkedInAt,
          eventId,
          orderId: ticketOrder._id
        }
      });
    } catch (error) {
      console.error('Validate ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate ticket',
        error: error.message
      });
    }
  },
  
  /**
   * Update attendee information for a ticket
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateAttendeeInfo: async (req, res) => {
    try {
      const { ticketOrderId, ticketNumber, attendeeName, attendeeEmail } = req.body;
      
      if (!ticketOrderId || !ticketNumber) {
        return res.status(400).json({
          success: false,
          message: 'Ticket order ID and ticket number are required'
        });
      }
      
      // Find the ticket order
      const ticketOrder = await Ticket.findById(ticketOrderId);
      
      if (!ticketOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ticket order not found'
        });
      }
      
      // Verify that the user is the owner of the ticket order
      if (ticketOrder.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this ticket'
        });
      }
      
      // Find the specific ticket in the order
      const ticketIndex = ticketOrder.tickets.findIndex(
        ticket => ticket.ticketNumber === ticketNumber
      );
      
      if (ticketIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found in order'
        });
      }
      
      // Update attendee information
      if (attendeeName) {
        ticketOrder.tickets[ticketIndex].attendeeName = attendeeName;
      }
      
      if (attendeeEmail) {
        ticketOrder.tickets[ticketIndex].attendeeEmail = attendeeEmail;
      }
      
      await ticketOrder.save();
      
      // Regenerate PDF with updated information
      if (ticketOrder.paymentStatus === 'succeeded') {
        try {
          const event = await Event.findById(ticketOrder.event);
          const user = await User.findById(ticketOrder.user);
          
          await generateTicketPDF(ticketOrder, event, user);
        } catch (pdfError) {
          console.error('Error regenerating PDF tickets:', pdfError);
          // Continue without failing the request
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Attendee information updated successfully',
        data: ticketOrder.tickets[ticketIndex]
      });
    } catch (error) {
      console.error('Update attendee info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update attendee information',
        error: error.message
      });
    }
  }
};

module.exports = ticketController; 