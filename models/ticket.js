const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Individual ticket schema (for each seat/person)
 */
const individualTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: [true, 'Ticket number is required'],
    validate: {
      validator: function(v) {
        return v && v.startsWith('TKT-') && v.length >= 12;
      },
      message: props => `${props.value} is not a valid ticket number format!`
    }
  },
  attendeeName: {
    type: String,
    default: null
  },
  attendeeEmail: {
    type: String,
    default: null
  },
  isCheckedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  qrCodeUrl: {
    type: String,
    default: null
  }
});

// Add a pre-save hook to ensure ticket numbers are always set
individualTicketSchema.pre('save', function(next) {
  if (!this.ticketNumber) {
    this.ticketNumber = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
  }
  next();
});

/**
 * Ticket Order Schema
 * Contains information about a ticket purchase
 */
const ticketSchema = new mongoose.Schema({
  // Core details
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  
  // Ticket information
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  tickets: [individualTicketSchema],
  
  // Payment information
  amount: {
    type: Number,
    required: [true, 'Amount is required']
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  paymentIntentId: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // PDF and tracking
  pdfUrl: {
    type: String,
    default: null
  },
  orderNumber: {
    type: String,
    default: () => `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
  },
  
  // Timestamps
  createdAt: {
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

// Create a compound index on event and user for faster lookups
ticketSchema.index({ event: 1, user: 1 });

// Create a unique index for ticket numbers within the tickets array
ticketSchema.index({ 'tickets.ticketNumber': 1 }, { unique: true, sparse: true });

// Add pre-save hook to ensure all tickets have unique numbers
ticketSchema.pre('save', async function(next) {
  // Ensure each ticket has a ticket number set
  const ticketNumbers = new Set();
  
  for (const ticket of this.tickets) {
    if (!ticket.ticketNumber) {
      ticket.ticketNumber = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
    }
    
    // Check for duplicates within this document
    if (ticketNumbers.has(ticket.ticketNumber)) {
      return next(new Error(`Duplicate ticket number ${ticket.ticketNumber} found in the same order`));
    }
    
    ticketNumbers.add(ticket.ticketNumber);
  }
  
  next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket; 