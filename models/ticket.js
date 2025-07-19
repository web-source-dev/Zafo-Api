const mongoose = require('mongoose');

/**
 * Ticket Schema
 * Handles ticket sales and payment tracking
 */
const ticketSchema = new mongoose.Schema({
  // Ticket Details
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  attendee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Attendee is required']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  
  // Multiple Tickets Support
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  
  // Individual ticket details for multiple tickets
  ticketDetails: [{
    attendeeName: {
      type: String,
      required: [true, 'Attendee name is required']
    },
    attendeeEmail: {
      type: String,
      required: [true, 'Attendee email is required']
    },
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required']
    },
    // New fields for partial refund support
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
      default: 'none'
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundReason: {
      type: String
    },
    refundedAt: {
      type: Date
    }
  }],
  
  // Payment Details
  ticketPrice: {
    type: Number,
    required: [true, 'Ticket price is required'],
    min: [0, 'Ticket price cannot be negative']
  },
  currency: {
    type: String,
    default: 'CHF',
    required: [true, 'Currency is required']
  },
  
  // Platform Fee (10% of total ticket price)
  platformFee: {
    type: Number,
    required: [true, 'Platform fee is required'],
    min: [0, 'Platform fee cannot be negative']
  },
  
  // Organizer Payment (90% of total ticket price)
  organizerPayment: {
    type: Number,
    required: [true, 'Organizer payment is required'],
    min: [0, 'Organizer payment cannot be negative']
  },
  
  // Stripe Payment Details
  stripePaymentIntentId: {
    type: String,
    required: [true, 'Stripe payment intent ID is required']
  },
  stripeTransferId: {
    type: String,
    default: null // Will be set when we transfer money to organizer
  },
  
  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  
  // Overall Refund Details (for backward compatibility)
  refundStatus: {
    type: String,
    enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
    default: 'none'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  cancellationFee: {
    type: Number,
    default: 2.50 // 2.50 CHF cancellation fee per ticket
  },
  refundReason: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  
  // Transfer Status
  organizerTransferStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  organizerTransferDate: {
    type: Date
  },
  
  // Timestamps
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
ticketSchema.index({ eventId: 1, attendee: 1 });
ticketSchema.index({ organizer: 1 });
ticketSchema.index({ paymentStatus: 1 });
ticketSchema.index({ organizerTransferStatus: 1 });
// Unique index on ticket numbers to prevent duplicates
ticketSchema.index({ 'ticketDetails.ticketNumber': 1 }, { unique: true, sparse: true });

// Virtual for total amount
ticketSchema.virtual('totalAmount').get(function() {
  return this.ticketPrice + this.platformFee;
});

// Method to calculate refund amounts
ticketSchema.methods.calculateRefundAmount = function() {
  if (this.refundStatus === 'none') {
    return 0;
  }
  
  // If fully refunded, return the ticket price minus cancellation fee
  if (this.refundStatus === 'completed') {
    return Math.max(0, this.ticketPrice - this.cancellationFee);
  }
  
  return this.refundAmount;
};

// Method to check if refund is possible
ticketSchema.methods.canRefund = function() {
  return this.paymentStatus === 'paid' && 
         this.refundStatus === 'none' && 
         new Date() < new Date(this.eventId.endDate);
};

// Method to get refundable tickets
ticketSchema.methods.getRefundableTickets = function() {
  return this.ticketDetails.filter(detail => detail.refundStatus === 'none');
};

// Method to calculate partial refund amount
ticketSchema.methods.calculatePartialRefundAmount = function(ticketNumbers) {
  const refundableTickets = this.ticketDetails.filter(detail => 
    ticketNumbers.includes(detail.ticketNumber) && detail.refundStatus === 'none'
  );
  
  if (refundableTickets.length === 0) {
    return 0;
  }
  
  const pricePerTicket = this.ticketPrice / this.quantity;
  const totalRefundAmount = refundableTickets.length * pricePerTicket;
  const cancellationFee = refundableTickets.length * 2.50; // 2.50 CHF per ticket
  
  return Math.max(0, totalRefundAmount - cancellationFee);
};

// Method to get active (non-refunded) tickets count
ticketSchema.methods.getActiveTicketsCount = function() {
  return this.ticketDetails.filter(detail => detail.refundStatus !== 'completed').length;
};

// Method to update quantity based on active tickets
ticketSchema.methods.updateQuantityFromActiveTickets = function() {
  this.quantity = this.getActiveTicketsCount();
  return this.quantity;
};

// Method to get refunded tickets count
ticketSchema.methods.getRefundedTicketsCount = function() {
  return this.ticketDetails.filter(detail => detail.refundStatus === 'completed').length;
};

// Pre-save hook to ensure ticket numbers are generated
ticketSchema.pre('save', async function(next) {
  try {
    // Only generate ticket numbers if they don't exist
    if (this.ticketDetails && this.ticketDetails.length > 0) {
      for (let i = 0; i < this.ticketDetails.length; i++) {
        const detail = this.ticketDetails[i];
        if (!detail.ticketNumber || detail.ticketNumber.trim() === '') {
          // Generate a single ticket number
          const ticketNumber = await this.constructor.generateTicketNumber(this.eventId, 'Event');
          detail.ticketNumber = ticketNumber;
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to generate unique ticket number for an event
ticketSchema.statics.generateTicketNumber = async function(eventId, eventTitle) {
  try {
    // Validate inputs
    if (!eventId || !eventTitle) {
      throw new Error('Event ID and title are required');
    }
    
  // Get the first 2 letters of the event title (case insensitive)
    const eventPrefix = eventTitle.substring(0, 2).toLowerCase().replace(/[^a-z]/g, '');
    
    // Fallback if event title is too short or contains no letters
    if (!eventPrefix || eventPrefix.length < 2) {
      const eventPrefix = 'ev';
    }
  
  // Find the highest ticket number for this event
  const highestTicket = await this.findOne(
    { 
      eventId: eventId,
      'ticketDetails.ticketNumber': { $regex: `^${eventPrefix}_` }
    },
    { 'ticketDetails.ticketNumber': 1 }
  ).sort({ 'ticketDetails.ticketNumber': -1 });
  
  let nextNumber = 1;
  
  if (highestTicket && highestTicket.ticketDetails.length > 0) {
    // Extract the highest number from existing tickets
    const ticketNumbers = highestTicket.ticketDetails
      .map(detail => detail.ticketNumber)
        .filter(number => number && number.startsWith(eventPrefix + '_'))
      .map(number => {
        const numPart = number.split('_')[1];
        return parseInt(numPart) || 0;
      });
    
    if (ticketNumbers.length > 0) {
      nextNumber = Math.max(...ticketNumbers) + 1;
    }
  }
  
  return `${eventPrefix}_${nextNumber}`;
  } catch (error) {
    console.error('Error generating ticket number:', error);
    // Fallback ticket number generation
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `tk_${timestamp}_${random}`;
  }
};

// Static method to generate multiple ticket numbers for an event
ticketSchema.statics.generateTicketNumbers = async function(eventId, eventTitle, quantity) {
  try {
    // Validate inputs
    if (!eventId || !eventTitle || !quantity || quantity < 1) {
      throw new Error('Event ID, title, and valid quantity are required');
    }
    
  // Get the first 2 letters of the event title (case insensitive)
    const eventPrefix = eventTitle.substring(0, 2).toLowerCase().replace(/[^a-z]/g, '');
    
    // Fallback if event title is too short or contains no letters
    if (!eventPrefix || eventPrefix.length < 2) {
      const eventPrefix = 'ev';
    }
  
  // Find all existing ticket numbers for this event
  const existingTickets = await this.find(
    { 
      eventId: eventId,
      'ticketDetails.ticketNumber': { $regex: `^${eventPrefix}_` }
    },
    { 'ticketDetails.ticketNumber': 1 }
  );
  
  // Extract all existing ticket numbers
  const existingNumbers = [];
  existingTickets.forEach(ticket => {
    ticket.ticketDetails.forEach(detail => {
        if (detail.ticketNumber && detail.ticketNumber.startsWith(eventPrefix + '_')) {
        const numPart = detail.ticketNumber.split('_')[1];
        const number = parseInt(numPart);
        if (!isNaN(number)) {
          existingNumbers.push(number);
        }
      }
    });
  });
  
  // Find the highest number
  const highestNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  
  // Generate new ticket numbers
  const ticketNumbers = [];
  for (let i = 1; i <= quantity; i++) {
    ticketNumbers.push(`${eventPrefix}_${highestNumber + i}`);
  }
  
  return ticketNumbers;
  } catch (error) {
    console.error('Error generating ticket numbers:', error);
    // Fallback ticket number generation
    const ticketNumbers = [];
    const timestamp = Date.now();
    for (let i = 0; i < quantity; i++) {
      const random = Math.floor(Math.random() * 1000);
      ticketNumbers.push(`tk_${timestamp}_${random}_${i}`);
    }
    return ticketNumbers;
  }
};

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket; 