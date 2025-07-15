const mongoose = require('mongoose');

/**
 * Event Schema
 * 
 * This schema uses simple string fields for content (no language-specific structure)
 */
const eventSchema = new mongoose.Schema({
  // Core Details
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  smallDescription: {
    type: String,
    required: [true, 'Small description is required']
  },
  aboutEvent: {
    type: String,
    required: [true, 'About event is required']
  },
  
  // Date and Time
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  
  // Location Info
  location: {
    name: {
      type: String,
      required: [true, 'Location name is required']
    },
    address: {
      street: { type: String, required: [true, 'Street address is required'] },
      city: { type: String, required: [true, 'City is required'] },
      state: { type: String },
      postalCode: { type: String, required: [true, 'Postal code is required'] },
      country: { type: String, required: [true, 'Country is required'] }
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    online: { type: Boolean, default: false },
    meetingLink: { type: String }
  },
  
  // New event details
  refundPolicy: {
    type: String
  },
  eventIncludes: {
    type: String
  },
  ageRange: {
    min: { type: Number },
    max: { type: Number }
  },
  arriveBy: {
    type: String
  },
  deliverBy: { type: String },
  
  // Speaker information
  speakers: [{
    name: { type: String, required: true },
    image: { type: String },
    about: {
      type: String
    },
    role: { type: String }
  }],
  
  // Custom additional fields
  additionalFields: [{
    title: {
      type: String
    },
    content: {
      type: String
    }
  }],
  
  // Capacity and Registration
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  registrationDeadline: {
    type: Date
  },
  
  // Additional Details
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['conference', 'workshop', 'seminar', 'networking', 'social', 'other']
  },
  tags: [{
    type: String
  }],
  
  // Images
  coverImage: {
    type: String
  },
  galleryImages: [{
    type: String
  }],
  
  // Pricing
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    isFree: { type: Boolean, default: true },
    platformFee: { type: Number } // Platform fee based on event duration
  },
  
  // Payment Status
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentId: { type: String },
  
  // Status and Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'canceled', 'completed', 'pending_payment'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Meta Information
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // SEO and Social
  slug: {
    type: String,
    unique: true
  },
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    ogImage: { type: String }
  },
}, {
  timestamps: true
});

// Generate slug before saving
eventSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    // Create a slug from the title
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
      
    // Add a timestamp to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
  }
  next();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event; 