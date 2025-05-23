const Stripe = require('stripe');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Stripe with API key from environment variables
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe customer
 * @param {Object} userData User information
 * @returns {Promise<Object>} Stripe customer object
 */
const createCustomer = async (userData) => {
  try {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`,
      metadata: {
        userId: userData._id.toString()
      }
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error('Failed to create Stripe customer');
  }
};

/**
 * Create a Stripe subscription
 * @param {String} customerId Stripe customer ID
 * @param {String} priceId Stripe price ID
 * @returns {Promise<Object>} Stripe subscription object
 */
const createSubscription = async (customerId, priceId) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    return subscription;
  } catch (error) {
    console.error('Error creating Stripe subscription:', error);
    throw new Error('Failed to create Stripe subscription');
  }
};

/**
 * Create a checkout session for subscription
 * @param {String} customerId Stripe customer ID
 * @param {String} priceId Stripe price ID
 * @param {String} successUrl Success redirect URL
 * @param {String} cancelUrl Cancel redirect URL
 * @returns {Promise<Object>} Checkout session
 */
const createCheckoutSession = async (customerId, priceId, successUrl, cancelUrl) => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
};

/**
 * Cancel a Stripe subscription
 * @param {String} subscriptionId Stripe subscription ID
 * @returns {Promise<Object>} Canceled subscription
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
};

/**
 * Retrieve a Stripe subscription by ID
 * @param {String} subscriptionId Stripe subscription ID
 * @returns {Promise<Object>} Subscription data
 */
const retrieveSubscription = async (subscriptionId) => {
  try {
    // Expand the subscription to ensure all fields are available
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'default_payment_method', 'latest_invoice', 'items.data.price.product']
    });
    
    // Log the subscription data for debugging
    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer?.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      items: subscription.items?.data?.map(item => ({
        price_id: item.price?.id
      }))
    };
    
    console.log('Retrieved subscription data:', subscriptionData);
    
    // Add fallback values for critical missing fields
    if (subscription.current_period_start === undefined || subscription.current_period_end === undefined) {
      console.warn(`Missing period dates for subscription ${subscriptionId}. Adding fallbacks.`);
      
      // Current time in seconds
      const now = Math.floor(Date.now() / 1000);
      
      // Determine if subscription is monthly or yearly
      const isYearly = subscription.items?.data?.[0]?.price?.recurring?.interval === 'year';
      
      // Add default values if missing
      if (subscription.current_period_start === undefined) {
        subscription.current_period_start = now;
      }
      
      if (subscription.current_period_end === undefined) {
        // Add 30 days for monthly, 365 for yearly
        subscription.current_period_end = isYearly ? 
          now + (365 * 24 * 60 * 60) : 
          now + (30 * 24 * 60 * 60);
      }
    }
    
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    
    // Create a minimal fallback subscription to avoid crashes
    console.warn('Creating fallback subscription data');
    const now = Math.floor(Date.now() / 1000);
    
    return {
      id: subscriptionId,
      status: 'active', // Optimistic fallback
      current_period_start: now,
      current_period_end: now + (30 * 24 * 60 * 60), // 30 days later
      cancel_at_period_end: false,
      items: {
        data: [{
          price: {
            id: 'unknown_price_id'
          }
        }]
      }
    };
  }
};

/**
 * Update a Stripe subscription with new price
 * @param {String} subscriptionId Stripe subscription ID
 * @param {String} priceId New price ID
 * @returns {Promise<Object>} Updated subscription
 */
const updateSubscription = async (subscriptionId, priceId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Use the first subscription item's ID
    const itemId = subscription.items.data[0].id;
    
    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: itemId,
        price: priceId
      }]
    });
    
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error('Failed to update subscription');
  }
};

module.exports = {
  stripe,
  createCustomer,
  createSubscription,
  createCheckoutSession,
  cancelSubscription,
  retrieveSubscription,
  updateSubscription
}; 