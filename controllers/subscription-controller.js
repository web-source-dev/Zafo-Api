const User = require('../models/user');
const Plan = require('../models/plan');
const Subscription = require('../models/subscription');
const stripeUtils = require('../utils/stripe');

/**
 * Get all available subscription plans
 * @route GET /api/subscriptions/plans
 * @access Public
 */
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
};

/**
 * Get current user's subscription details
 * @route GET /api/subscriptions/me
 * @access Private
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      user: req.user._id,
      status: 'active'
    }).populate('plan');
    
    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active subscription found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
};

/**
 * Create a checkout session for a subscription
 * @route POST /api/subscriptions/create-checkout-session
 * @access Private (organizer only)
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    
    // Validate required fields
    if (!planId || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and billing cycle are required'
      });
    }
    
    // Verify billing cycle is valid
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return res.status(400).json({
        success: false,
        message: 'Billing cycle must be either "monthly" or "yearly"'
      });
    }
    
    // Fetch the plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }
    
    // Determine which Stripe price ID to use
    const priceId = billingCycle === 'monthly' 
      ? plan.stripePriceIdMonthly 
      : plan.stripePriceIdYearly;
    
    // Get current user
    const user = req.user;
    
    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripeUtils.createCustomer(user);
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
    }
    
    // Define success and cancel URLs
    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/plans`;
    
    // Create checkout session
    const session = await stripeUtils.createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl
    );
    
    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session'
    });
  }
};

/**
 * Handle successful subscription after checkout
 * @route POST /api/subscriptions/checkout-success
 * @access Private
 */
const handleCheckoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    // Retrieve the session
    const session = await stripeUtils.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer', 'line_items']
    });
    
    // Verify the session belongs to the current user
    if (session.customer.id !== req.user.stripeCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Session does not belong to the current user'
      });
    }
    
    const stripeSubscriptionId = session.subscription.id;
    const stripeSubscription = await stripeUtils.retrieveSubscription(stripeSubscriptionId);
    
    // Find the plan based on the price ID
    const priceId = stripeSubscription.items.data[0].price.id;
    let plan;
    
    plan = await Plan.findOne({
      $or: [
        { stripePriceIdMonthly: priceId },
        { stripePriceIdYearly: priceId }
      ]
    });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found for the given price'
      });
    }
    
    // Determine billing cycle
    const billingCycle = priceId === plan.stripePriceIdMonthly ? 'monthly' : 'yearly';
    
    // Convert Unix timestamps to JavaScript Date objects with fallbacks
    const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    
    // Use the values from Stripe or fallback to calculated values based on billing cycle
    const periodStart = stripeSubscription.current_period_start || now;
    let periodEnd;
    
    if (stripeSubscription.current_period_end) {
      periodEnd = stripeSubscription.current_period_end;
    } else {
      // Calculate end date based on billing cycle if not provided by Stripe
      periodEnd = billingCycle === 'monthly' ? now + (30 * 24 * 60 * 60) : now + (365 * 24 * 60 * 60);
    }
    
    const currentPeriodStart = new Date(periodStart * 1000);
    const currentPeriodEnd = new Date(periodEnd * 1000);
    
    // Verify dates are valid
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
      console.error('Invalid date values in subscription:', {
        id: stripeSubscription.id,
        start: periodStart,
        end: periodEnd,
        calculated_start: currentPeriodStart,
        calculated_end: currentPeriodEnd
      });
      return res.status(500).json({
        success: false,
        message: 'Error processing subscription dates'
      });
    }
    
    // Create or update the subscription in our database
    let subscription = await Subscription.findOne({ 
      user: req.user._id,
      status: 'active'
    });
    
    if (subscription) {
      // Update existing subscription
      subscription.plan = plan._id;
      subscription.stripeSubscriptionId = stripeSubscriptionId;
      subscription.status = stripeSubscription.status;
      subscription.currentPeriodStart = currentPeriodStart;
      subscription.currentPeriodEnd = currentPeriodEnd;
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false;
      subscription.billingCycle = billingCycle;
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        user: req.user._id,
        plan: plan._id,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: req.user.stripeCustomerId,
        status: stripeSubscription.status,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
        billingCycle
      });
    }
    
    // Update user's subscription status
    await User.findByIdAndUpdate(req.user._id, {
      isSubscribed: true
    });
    
    res.status(200).json({
      success: true,
      data: {
        subscription
      },
      message: 'Subscription activated successfully'
    });
  } catch (error) {
    console.error('Error handling checkout success:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process subscription'
    });
  }
};

/**
 * Cancel current subscription
 * @route POST /api/subscriptions/cancel
 * @access Private
 */
const cancelCurrentSubscription = async (req, res) => {
  try {
    // Find user's active subscription
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    // Cancel the subscription in Stripe
    const canceledSubscription = await stripeUtils.cancelSubscription(subscription.stripeSubscriptionId);
    
    // Safely get the end date with fallback
    let endDate;
    try {
      if (canceledSubscription.current_period_end) {
        endDate = new Date(canceledSubscription.current_period_end * 1000);
        
        // Verify date is valid
        if (isNaN(endDate.getTime())) {
          throw new Error('Invalid date conversion');
        }
      } else {
        // Use subscription's existing end date or calculate one month from now
        endDate = subscription.currentPeriodEnd || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
      }
    } catch (error) {
      console.error('Error converting date:', error);
      // Fallback to one month from now
      endDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
    }
    
    // Update subscription in database
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();
    
    res.status(200).json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      data: {
        currentPeriodEnd: endDate
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

/**
 * Handle Stripe webhook events
 * @route POST /api/subscriptions/webhook
 * @access Public
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    // Log incoming webhook request details (not the full body for security)
    console.log('Webhook received with signature:', sig?.substring(0, 10) + '...');
    console.log('Request body type:', typeof req.body);
    console.log('Request body length:', typeof req.body === 'string' ? req.body.length : 'Not a string');
    
    if (!sig) {
      throw new Error('No Stripe signature found in headers');
    }
    
    if (!req.body || (typeof req.body !== 'string' && !Buffer.isBuffer(req.body))) {
      console.error('Webhook payload is not a string or Buffer:', typeof req.body);
      throw new Error('Webhook payload must be provided as a string or Buffer');
    }
    
    const event = stripeUtils.stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Log successful event construction
    console.log(`Received Stripe webhook event: ${event.type}`);
    console.log('Event ID:', event.id);
    
    // Handle specific events
    switch (event.type) {
      case 'customer.subscription.updated':
        // Handle subscription updates - this includes plan changes, payment method changes, etc.
        console.log('Subscription updated event received');
        
        const updatedSubscription = event.data.object;
        const previousSubscription = event.data.previous_attributes;
        
        // Check if this was a plan change by comparing items
        if (previousSubscription && previousSubscription.items) {
          console.log('Detected possible plan change');
          
          // Get current and previous price IDs
          const currentPriceId = updatedSubscription.items.data[0]?.price?.id;
          const previousItems = previousSubscription.items.data;
          
          if (currentPriceId && previousItems && previousItems.length > 0) {
            const previousPriceId = previousItems[0]?.price?.id;
            
            if (currentPriceId !== previousPriceId) {
              console.log(`Plan changed from price ${previousPriceId} to ${currentPriceId}`);
            }
          }
        }
        
        // Check if the billing cycle changed (determine by looking at the price interval)
        if (previousSubscription && previousSubscription.items) {
          const currentInterval = updatedSubscription.items.data[0]?.price?.recurring?.interval;
          const previousInterval = previousSubscription?.items?.data[0]?.price?.recurring?.interval;
          
          if (currentInterval && previousInterval && currentInterval !== previousInterval) {
            console.log(`Billing cycle changed from ${previousInterval} to ${currentInterval}`);
          }
        }
        
        // Process the subscription update regardless of what changed
        await handleSubscriptionUpdated(updatedSubscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // More detailed error for common webhook issues
    if (error.message.includes('No signatures found matching')) {
      console.error('Signature verification failed. Check STRIPE_WEBHOOK_SECRET in .env');
    } else if (error.message.includes('payload')) {
      console.error('Body processing error. Make sure express.raw middleware is applied correctly');
    }
    
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * Handle subscription updated webhook event
 */
const handleSubscriptionUpdated = async (stripeSubscription) => {
  try {
    // Find the subscription in our database
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id
    });
    
    if (!subscription) {
      console.error('Subscription not found:', stripeSubscription.id);
      return;
    }
    
    // Convert Unix timestamps to JavaScript Date objects with fallbacks
    const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    
    // Determine billing cycle from our database
    const billingCycle = subscription.billingCycle || 'monthly';
    
    // Use the values from Stripe or fallback to calculated values based on billing cycle
    const periodStart = stripeSubscription.current_period_start || now;
    let periodEnd;
    
    if (stripeSubscription.current_period_end) {
      periodEnd = stripeSubscription.current_period_end;
    } else {
      // Calculate end date based on billing cycle if not provided by Stripe
      periodEnd = billingCycle === 'monthly' ? now + (30 * 24 * 60 * 60) : now + (365 * 24 * 60 * 60);
    }
    
    const currentPeriodStart = new Date(periodStart * 1000);
    const currentPeriodEnd = new Date(periodEnd * 1000);
    
    // Verify dates are valid before saving
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
      console.error('Invalid date values in subscription:', {
        id: stripeSubscription.id,
        start: periodStart,
        end: periodEnd,
        calculated_start: currentPeriodStart,
        calculated_end: currentPeriodEnd
      });
      return;
    }
    
    // Update subscription status and details
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = currentPeriodStart;
    subscription.currentPeriodEnd = currentPeriodEnd;
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false;
    
    await subscription.save();
    
    // Update user subscription status if needed
    if (stripeSubscription.status === 'active') {
      await User.findByIdAndUpdate(subscription.user, {
        isSubscribed: true
      });
    } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(stripeSubscription.status)) {
      await User.findByIdAndUpdate(subscription.user, {
        isSubscribed: false
      });
    }
  } catch (error) {
    console.error('Error handling subscription updated webhook:', error);
  }
};

/**
 * Handle subscription deleted webhook event
 */
const handleSubscriptionDeleted = async (stripeSubscription) => {
  try {
    // Find the subscription in our database
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id
    });
    
    if (!subscription) {
      console.error('Subscription not found:', stripeSubscription.id);
      return;
    }
    
    // Update subscription status
    subscription.status = 'canceled';
    await subscription.save();
    
    // Update user subscription status
    await User.findByIdAndUpdate(subscription.user, {
      isSubscribed: false
    });
  } catch (error) {
    console.error('Error handling subscription deleted webhook:', error);
  }
};

/**
 * Handle payment failed webhook event
 */
const handlePaymentFailed = async (invoice) => {
  try {
    // Find the subscription in our database
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });
    
    if (!subscription) {
      console.error('Subscription not found:', invoice.subscription);
      return;
    }
    
    // Update subscription status
    subscription.status = 'past_due';
    await subscription.save();
    
    // Optionally notify the user about the payment failure
    // This would typically involve sending an email
  } catch (error) {
    console.error('Error handling payment failed webhook:', error);
  }
};

/**
 * Change subscription plan
 * @route POST /api/subscriptions/change-plan
 * @access Private (organizer only)
 */
const changeSubscriptionPlan = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    
    // Validate required fields
    if (!planId || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and billing cycle are required'
      });
    }
    
    // Verify billing cycle is valid
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return res.status(400).json({
        success: false,
        message: 'Billing cycle must be either "monthly" or "yearly"'
      });
    }
    
    // Find user's active subscription
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    // Fetch the new plan
    const newPlan = await Plan.findById(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }
    
    // Determine which Stripe price ID to use for the new plan
    const newPriceId = billingCycle === 'monthly' 
      ? newPlan.stripePriceIdMonthly 
      : newPlan.stripePriceIdYearly;
    
    // Get the existing subscription from Stripe to ensure it's valid
    const stripeSubscription = await stripeUtils.retrieveSubscription(subscription.stripeSubscriptionId);
    
    if (stripeSubscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not active in Stripe'
      });
    }
    
    // Update the subscription in Stripe
    const updatedStripeSubscription = await stripeUtils.updateSubscription(
      subscription.stripeSubscriptionId,
      newPriceId
    );
    
    // Convert Unix timestamps to JavaScript Date objects with fallbacks
    const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    
    // Use the values from Stripe or fallback to calculated values based on billing cycle
    const periodStart = updatedStripeSubscription.current_period_start || now;
    let periodEnd;
    
    if (updatedStripeSubscription.current_period_end) {
      periodEnd = updatedStripeSubscription.current_period_end;
    } else {
      // Calculate end date based on billing cycle if not provided by Stripe
      periodEnd = billingCycle === 'monthly' ? now + (30 * 24 * 60 * 60) : now + (365 * 24 * 60 * 60);
    }
    
    const currentPeriodStart = new Date(periodStart * 1000);
    const currentPeriodEnd = new Date(periodEnd * 1000);
    
    // Verify dates are valid
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
      console.error('Invalid date values in subscription:', {
        id: updatedStripeSubscription.id,
        start: periodStart,
        end: periodEnd,
        calculated_start: currentPeriodStart,
        calculated_end: currentPeriodEnd
      });
      return res.status(500).json({
        success: false,
        message: 'Error processing subscription dates'
      });
    }
    
    // Update subscription in database
    subscription.plan = newPlan._id;
    subscription.status = updatedStripeSubscription.status;
    subscription.currentPeriodStart = currentPeriodStart;
    subscription.currentPeriodEnd = currentPeriodEnd;
    subscription.cancelAtPeriodEnd = updatedStripeSubscription.cancel_at_period_end || false;
    subscription.billingCycle = billingCycle;
    
    await subscription.save();
    
    // Return the updated subscription with populated plan
    const updatedSubscription = await Subscription.findById(subscription._id).populate('plan');
    
    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: {
        subscription: updatedSubscription
      }
    });
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change subscription plan'
    });
  }
};

/**
 * Sync subscription with Stripe
 * This ensures our database has the latest data from Stripe
 * @route POST /api/subscriptions/sync
 * @access Private
 */
const syncSubscriptionWithStripe = async (req, res) => {
  try {
    // Find the user's active subscription
    let subscription = await Subscription.findOne({
      user: req.user._id
    }).populate('plan');
    
    // If no subscription found, check if user has stripeCustomerId
    if (!subscription && req.user.stripeCustomerId) {
      console.log('No local subscription found, checking Stripe for user:', req.user._id);
      
      // Query Stripe for active subscriptions for this customer
      const stripeSubscriptions = await stripeUtils.stripe.subscriptions.list({
        customer: req.user.stripeCustomerId,
        status: 'active',
        limit: 1
      });
      
      // If subscription found in Stripe but not in our DB, create it
      if (stripeSubscriptions.data.length > 0) {
        const stripeSubscription = stripeSubscriptions.data[0];
        console.log('Found active Stripe subscription not in DB:', stripeSubscription.id);
        
        // Get price ID to find matching plan
        const priceId = stripeSubscription.items.data[0].price.id;
        
        // Find the plan based on the price ID
        const plan = await Plan.findOne({
          $or: [
            { stripePriceIdMonthly: priceId },
            { stripePriceIdYearly: priceId }
          ]
        });
        
        if (!plan) {
          return res.status(404).json({
            success: false,
            message: 'Plan not found for the given Stripe subscription',
            data: { subscription: null }
          });
        }
        
        // Determine billing cycle
        const billingCycle = priceId === plan.stripePriceIdMonthly ? 'monthly' : 'yearly';
        
        // Convert Unix timestamps to JavaScript Date objects with fallbacks
        const now = Math.floor(Date.now() / 1000);
        const periodStart = stripeSubscription.current_period_start || now;
        let periodEnd;
        
        if (stripeSubscription.current_period_end) {
          periodEnd = stripeSubscription.current_period_end;
        } else {
          periodEnd = billingCycle === 'monthly' ? now + (30 * 24 * 60 * 60) : now + (365 * 24 * 60 * 60);
        }
        
        const currentPeriodStart = new Date(periodStart * 1000);
        const currentPeriodEnd = new Date(periodEnd * 1000);
        
        // Create new subscription in database
        subscription = await Subscription.create({
          user: req.user._id,
          plan: plan._id,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: req.user.stripeCustomerId,
          status: stripeSubscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
          billingCycle
        });
        
        // Update user's subscription status
        await User.findByIdAndUpdate(req.user._id, {
          isSubscribed: true
        });
        
        // Populate the plan
        subscription = await Subscription.findById(subscription._id).populate('plan');
        
        return res.status(200).json({
          success: true,
          message: 'Created subscription from Stripe data',
          data: { subscription }
        });
      }
      
      // No subscription found in Stripe either
      return res.status(200).json({
        success: true,
        message: 'No active subscription found',
        data: { subscription: null }
      });
    }
    
    // If no subscription found in our DB or Stripe
    if (!subscription) {
      return res.status(200).json({
        success: true,
        message: 'No subscription found to sync',
        data: { subscription: null }
      });
    }
    
    // Get fresh data from Stripe
    try {
      const stripeSubscription = await stripeUtils.retrieveSubscription(subscription.stripeSubscriptionId);
      
      // Update status from Stripe
      if (subscription.status !== stripeSubscription.status) {
        subscription.status = stripeSubscription.status;
        
        // Update user's subscription status
        if (stripeSubscription.status === 'active') {
          await User.findByIdAndUpdate(req.user._id, { isSubscribed: true });
        } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(stripeSubscription.status)) {
          await User.findByIdAndUpdate(req.user._id, { isSubscribed: false });
        }
      }
      
      // Convert Unix timestamps to JavaScript Date objects with fallbacks
      const now = Math.floor(Date.now() / 1000);
      const periodStart = stripeSubscription.current_period_start || now;
      let periodEnd;
      
      if (stripeSubscription.current_period_end) {
        periodEnd = stripeSubscription.current_period_end;
      } else {
        // Calculate end date based on billing cycle
        periodEnd = subscription.billingCycle === 'monthly' ? 
          now + (30 * 24 * 60 * 60) : 
          now + (365 * 24 * 60 * 60);
      }
      
      const currentPeriodStart = new Date(periodStart * 1000);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      
      // Update period dates and cancel status
      subscription.currentPeriodStart = currentPeriodStart;
      subscription.currentPeriodEnd = currentPeriodEnd;
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false;
      
      await subscription.save();
      
      return res.status(200).json({
        success: true,
        message: 'Subscription synced with Stripe',
        data: { subscription }
      });
    } catch (error) {
      console.error('Error retrieving subscription from Stripe for sync:', error);
      
      // If Stripe can't find the subscription, mark it as inactive in our DB
      if (error.message.includes('No such subscription') || error.message.includes('not found')) {
        subscription.status = 'canceled';
        await subscription.save();
        
        // Update user's subscription status
        await User.findByIdAndUpdate(req.user._id, { isSubscribed: false });
        
        return res.status(200).json({
          success: true,
          message: 'Subscription not found in Stripe, marked as canceled',
          data: { subscription }
        });
      }
      
      throw error; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    console.error('Error syncing subscription with Stripe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync subscription with Stripe'
    });
  }
};

/**
 * Get a specific subscription plan by ID
 * @route GET /api/subscriptions/plans/:id
 * @access Public
 */
const getPlanById = async (req, res) => {
  try {
    const planId = req.params.id;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    const plan = await Plan.findById(planId);
    
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }
    
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error fetching plan by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plan'
    });
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  handleCheckoutSuccess,
  cancelCurrentSubscription,
  changeSubscriptionPlan,
  syncSubscriptionWithStripe,
  handleWebhook,
  getPlanById
}; 