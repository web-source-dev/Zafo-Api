/**
 * Checkout Testing Script
 * 
 * This script allows you to test the checkout process without going through the frontend.
 * It creates a Stripe checkout session for a subscription and logs the session URL.
 * 
 * Usage: node scripts/test-checkout.js <planId> <billingCycle>
 * Example: node scripts/test-checkout.js 612345678901234567890123 monthly
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const stripeUtils = require('../utils/stripe');
const User = require('../models/user');
const Plan = require('../models/plan');

// Load environment variables
dotenv.config();

// Parse command line arguments
const planId = process.argv[2];
const billingCycle = process.argv[3] || 'monthly';

if (!planId) {
  console.error('Please provide a plan ID as the first argument');
  process.exit(1);
}

if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
  console.error('Billing cycle must be either "monthly" or "yearly"');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Main function to test checkout
const testCheckout = async () => {
  try {
    // Fetch the plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      console.error('Plan not found or inactive');
      return;
    }
    
    console.log(`Found plan: ${plan.name}`);
    
    // Find a test user (first organizer in the database)
    const user = await User.findOne({ role: 'organizer' });
    if (!user) {
      console.error('No organizer user found in the database');
      return;
    }
    
    console.log(`Using test user: ${user.email}`);
    
    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // Create a new Stripe customer
      console.log('Creating new Stripe customer...');
      const customer = await stripeUtils.createCustomer(user);
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
      console.log(`Created customer with ID: ${customerId}`);
    } else {
      console.log(`Using existing customer ID: ${customerId}`);
    }
    
    // Determine which Stripe price ID to use
    const priceId = billingCycle === 'monthly' 
      ? plan.stripePriceIdMonthly 
      : plan.stripePriceIdYearly;
    
    console.log(`Using price ID for ${billingCycle} billing: ${priceId}`);
    
    // Define success and cancel URLs
    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/plans`;
    
    // Create checkout session
    console.log('Creating checkout session...');
    const session = await stripeUtils.createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl
    );
    
    console.log('\n======= CHECKOUT SESSION CREATED =======');
    console.log(`Session ID: ${session.id}`);
    console.log(`Checkout URL: ${session.url}`);
    console.log('=======================================\n');
    console.log('Open this URL in your browser to test the checkout flow:');
    console.log(session.url);
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
  }
};

// Run the test
testCheckout()
  .then(() => {
    console.log('Test script completed');
    setTimeout(() => process.exit(0), 1000);
  })
  .catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
  }); 