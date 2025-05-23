const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    trim: true
  },
  features: [{
    type: String,
    required: [true, 'Plan features are required']
  }],
  priceMonthly: {
    type: Number,
    required: [true, 'Monthly price is required']
  },
  priceYearly: {
    type: Number,
    required: [true, 'Yearly price is required']
  },
  stripePriceIdMonthly: {
    type: String,
    required: [true, 'Stripe monthly price ID is required']
  },
  stripePriceIdYearly: {
    type: String,
    required: [true, 'Stripe yearly price ID is required']
  },
  stripeProductId: {
    type: String,
    required: [true, 'Stripe product ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  limits: {
    monthlyEvents: {
      type: Number,
      default: 0
    },
    yearlyEvents: {
      type: Number,
      default: 0
    },
    allowPricing: {
      type: Boolean,
      default: false
    },
    allowDetailedDescription: {
      type: Boolean,
      default: false
    },
    allowAdvancedFeatures: {
      type: Boolean,
      default: false
    },
    allowPremiumFeatures: {
      type: Boolean,
      default: false
    }
  },
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

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan; 