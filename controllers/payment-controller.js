const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Event = require('../models/event');
const Ticket = require('../models/ticket');

/**
 * Payment Controller
 * Handles all payment-related operations
 */
const paymentController = {
  /**
   * Create a Stripe checkout session for event platform fee
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createCheckoutSession: async (req, res) => {
    try {
      const { eventId, amount, currency, eventTitle } = req.body;
      
      if (!eventId || !amount || !currency) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Find the event
      const event = await Event.findById(eventId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Verify that the current user is the event organizer
      console.log('Payment authorization check:');
      console.log('User ID:', req.user._id.toString());
      console.log('Event Organizer ID:', event.organizer.toString());
      console.log('User Role:', req.user.role);
      console.log('IDs match:', req.user._id.toString() === event.organizer.toString());
      
      if (req.user._id.toString() !== event.organizer.toString() && req.user.role !== 'admin') {
        console.log('Authorization failed - user not authorized to pay for this event');
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to pay for this event'
        });
      }
      
      console.log('Authorization successful - proceeding with payment');
      
      // Check if the event is already paid
      if (event.isPaid) {
        return res.status(400).json({
          success: false,
          message: 'This event has already been paid for'
        });
      }
      
      // Create a Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Platform Fee for: ${eventTitle || 'Event'}`,
                description: 'One-time platform fee for event creation',
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&event_id=${eventId}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?event_id=${eventId}`,
        metadata: {
          eventId: eventId,
          userId: req.user._id.toString()
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Checkout session created',
        data: {
          sessionId: session.id,
          sessionUrl: session.url
        }
      });
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create checkout session',
        error: error.message
      });
    }
  },
  
  /**
   * Handle Stripe webhook events
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  handleWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody, 
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Extract metadata
        const { eventId, userId } = session.metadata;
        
        if (eventId) {
          try {
            // Find the event first to check its current status
            const eventDoc = await Event.findById(eventId);
            
            if (!eventDoc) {
              console.error(`Event ${eventId} not found`);
              break;
            }
            
            // Update the event to mark as paid
            const updateData = { 
              isPaid: true,
              paidAt: new Date(),
              paymentId: session.id
            };
            
            // If event is in pending_payment status, publish it
            if (eventDoc.status === 'pending_payment') {
              updateData.status = 'published';
            }
            
            await Event.findByIdAndUpdate(eventId, updateData);
            
            console.log(`Payment for event ${eventId} completed successfully`);
          } catch (error) {
            console.error('Error updating event payment status:', error);
          }
        }
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Check if this is a ticket payment
        if (paymentIntent.metadata && paymentIntent.metadata.eventId && paymentIntent.metadata.attendeeId) {
          try {
            // Find the ticket
            const ticket = await Ticket.findOne({ stripePaymentIntentId: paymentIntent.id });
            
            if (ticket) {
              // Update ticket payment status
              ticket.paymentStatus = 'paid';
              await ticket.save();
              
              console.log(`Ticket payment completed for ticket ${ticket._id}`);
            }
          } catch (error) {
            console.error('Error updating ticket payment status:', error);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        
        // Check if this is a ticket payment
        if (failedPaymentIntent.metadata && failedPaymentIntent.metadata.eventId && failedPaymentIntent.metadata.attendeeId) {
          try {
            // Find the ticket
            const ticket = await Ticket.findOne({ stripePaymentIntentId: failedPaymentIntent.id });
            
            if (ticket) {
              // Update ticket payment status
              ticket.paymentStatus = 'failed';
              await ticket.save();
              
              console.log(`Ticket payment failed for ticket ${ticket._id}`);
            }
          } catch (error) {
            console.error('Error updating ticket payment status:', error);
          }
        }
        break;
        
      case 'charge.refunded':
        const refund = event.data.object;
        
        // Check if this is a ticket refund
        if (refund.metadata && refund.metadata.ticketId) {
          try {
            // Find the ticket
            const ticket = await Ticket.findById(refund.metadata.ticketId);
            
            if (ticket) {
              // Parse refunded tickets from metadata
              const refundedTickets = refund.metadata.refundedTickets ? 
                JSON.parse(refund.metadata.refundedTickets) : [];
              
              // Update ticket refund status
              ticket.refundStatus = 'completed';
              ticket.refundedAt = new Date();
              ticket.refundAmount = refund.amount / 100; // Convert from cents
              
              // Update individual ticket status
              if (refundedTickets.length > 0) {
                ticket.ticketDetails.forEach(detail => {
                  if (refundedTickets.includes(detail.ticketNumber)) {
                    detail.refundStatus = 'completed';
                    detail.refundedAt = new Date();
                  }
                });
                
                // Update payment status based on refund amount
                if (ticket.refundAmount >= ticket.ticketPrice) {
                  ticket.paymentStatus = 'refunded';
                } else {
                  ticket.paymentStatus = 'partially_refunded';
                }
              } else {
                // Full refund
                ticket.paymentStatus = 'refunded';
                ticket.ticketDetails.forEach(detail => {
                  detail.refundStatus = 'completed';
                  detail.refundedAt = new Date();
                });
              }
              
              await ticket.save();
              
              console.log(`Ticket refund completed for ticket ${ticket._id}`);
            }
          } catch (error) {
            console.error('Error updating ticket refund status:', error);
          }
        }
        break;
        
      case 'transfer.created':
        const transfer = event.data.object;
        
        // Check if this is an organizer transfer
        if (transfer.metadata && transfer.metadata.ticketId) {
          try {
            // Find the ticket
            const ticket = await Ticket.findById(transfer.metadata.ticketId);
            
            if (ticket) {
              // Update ticket transfer status
              ticket.organizerTransferStatus = 'completed';
              ticket.stripeTransferId = transfer.id;
              ticket.organizerTransferDate = new Date();
              await ticket.save();
              
              console.log(`Organizer transfer completed for ticket ${ticket._id}`);
            }
          } catch (error) {
            console.error('Error updating ticket transfer status:', error);
          }
        }
        break;
        
      case 'transfer.failed':
        const failedTransfer = event.data.object;
        
        // Check if this is an organizer transfer
        if (failedTransfer.metadata && failedTransfer.metadata.ticketId) {
          try {
            // Find the ticket
            const ticket = await Ticket.findById(failedTransfer.metadata.ticketId);
            
            if (ticket) {
              // Update ticket transfer status
              ticket.organizerTransferStatus = 'failed';
              await ticket.save();
              
              console.log(`Organizer transfer failed for ticket ${ticket._id}`);
            }
          } catch (error) {
            console.error('Error updating ticket transfer status:', error);
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  },
  
  /**
   * Verify payment status of an event
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  verifyPayment: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { sessionId } = req.query; // Optional session ID from Stripe
      
      // Find the event
      const event = await Event.findById(eventId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // If session ID is provided, verify directly with Stripe
      if (sessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          
          // If this session is for this event and is paid
          if (session && session.metadata && session.metadata.eventId === eventId && 
              session.payment_status === 'paid' && !event.isPaid) {
            
            // Update the event to mark as paid
            const updateData = { 
              isPaid: true,
              paidAt: new Date(),
              paymentId: session.id
            };
            
            // If event is in pending_payment status, publish it
            if (event.status === 'pending_payment') {
              updateData.status = 'published';
            }
            
            await Event.findByIdAndUpdate(eventId, updateData);
            
            console.log(`Payment for event ${eventId} verified and updated via direct check`);
          }
        } catch (stripeError) {
          console.error('Stripe session verification error:', stripeError);
          // We'll continue with normal verification even if Stripe check fails
        }
      }
      
      // Verify that the current user is the event organizer if user is authenticated
      // Skip this check if the session ID was provided
      if (!sessionId && req.user && req.user._id.toString() !== event.organizer.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to check payment status for this event'
        });
      }
      
      // Re-fetch the event to get the latest status after potential updates
      const updatedEvent = await Event.findById(eventId);
      
      res.status(200).json({
        success: true,
        data: {
          isPaid: !!updatedEvent.isPaid,
          paidAt: updatedEvent.paidAt,
          status: updatedEvent.status
        }
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment status',
        error: error.message
      });
    }
  }
};

module.exports = paymentController; 