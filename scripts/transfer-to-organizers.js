const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Ticket = require('../models/ticket');
require('dotenv').config();

/**
 * Script to transfer money to organizers for completed events
 * This script should be run daily via cron job
 */
async function transferToOrganizers() {
  try {
    console.log('Starting organizer transfer process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all paid tickets for completed events that haven't been transferred yet
    const pendingTransfers = await Ticket.find({
      paymentStatus: 'paid',
      organizerTransferStatus: 'pending'
    }).populate('eventId').populate('organizer');
    
    console.log(`Found ${pendingTransfers.length} pending transfers`);
    
    const completedEvents = pendingTransfers.filter(ticket => {
      return new Date(ticket.eventId.endDate) < new Date();
    });
    
    console.log(`${completedEvents.length} tickets are for completed events`);
    
    const transferResults = [];
    
    for (const ticket of completedEvents) {
      try {
        console.log(`Processing transfer for ticket ${ticket._id}`);
        
        // Check if organizer has Stripe account
        if (!ticket.organizer.stripeCustomerId) {
          console.log(`Organizer ${ticket.organizer._id} has no Stripe account - skipping`);
          transferResults.push({
            ticketId: ticket._id,
            status: 'skipped',
            reason: 'Organizer has no Stripe account'
          });
          continue;
        }
        
        // Check if organizer payments are blocked
        if (ticket.organizer.isPaymentBlocked) {
          console.log(`Organizer ${ticket.organizer._id} has payments blocked - skipping`);
          transferResults.push({
            ticketId: ticket._id,
            status: 'skipped',
            reason: 'Organizer payments are blocked'
          });
          continue;
        }
        
        // Create transfer to organizer
        const transfer = await stripe.transfers.create({
          amount: Math.round(ticket.organizerPayment * 100), // Convert to cents
          currency: ticket.currency.toLowerCase(),
          destination: ticket.organizer.stripeCustomerId,
          metadata: {
            ticketId: ticket._id.toString(),
            eventId: ticket.eventId._id.toString(),
            organizerId: ticket.organizer._id.toString()
          }
        });
        
        // Update ticket transfer status
        ticket.organizerTransferStatus = 'completed';
        ticket.stripeTransferId = transfer.id;
        ticket.organizerTransferDate = new Date();
        await ticket.save();
        
        console.log(`Transfer completed for ticket ${ticket._id}: ${transfer.id}`);
        
        transferResults.push({
          ticketId: ticket._id,
          status: 'completed',
          transferId: transfer.id,
          amount: ticket.organizerPayment
        });
        
      } catch (transferError) {
        console.error(`Transfer failed for ticket ${ticket._id}:`, transferError);
        
        // Mark transfer as failed
        ticket.organizerTransferStatus = 'failed';
        await ticket.save();
        
        transferResults.push({
          ticketId: ticket._id,
          status: 'failed',
          error: transferError.message
        });
      }
    }
    
    console.log('Transfer process completed');
    console.log('Results:', transferResults);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    return transferResults;
    
  } catch (error) {
    console.error('Transfer to organizers error:', error);
    await mongoose.disconnect();
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  transferToOrganizers()
    .then(results => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = transferToOrganizers; 