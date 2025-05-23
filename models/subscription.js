const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: [true, 'Plan is required']
  },
  stripeSubscriptionId: {
    type: String,
    required: [true, 'Stripe subscription ID is required']
  },
  stripeCustomerId: {
    type: String,
    required: [true, 'Stripe customer ID is required']
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid'],
    default: 'active'
  },
  currentPeriodStart: {
    type: Date,
    required: [true, 'Current period start is required']
  },
  currentPeriodEnd: {
    type: Date,
    required: [true, 'Current period end is required']
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: [true, 'Billing cycle is required']
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

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 