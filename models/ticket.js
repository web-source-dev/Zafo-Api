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
      type: Number,
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

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket; 