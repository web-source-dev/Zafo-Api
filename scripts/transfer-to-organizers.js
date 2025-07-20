const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Ticket = require('../models/ticket');
require('dotenv').config();

/**
 * Script to transfer money to organizers for completed events
 * This script should be run daily via cron job
 * @param {boolean} isManualTransfer - If true, transfer for published/completed events. If false, only completed events.
 */
async function transferToOrganizers(isManualTransfer = false) {
  try {
    console.log('Starting organizer transfer process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all paid tickets for completed events that haven't been transferred yet
    const pendingTransfers = await Ticket.find({
      paymentStatus: { $in: ['paid', 'partially_refunded'] },
      organizerTransferStatus: 'pending'
    }).populate('eventId').populate('organizer');
    
    console.log(`Found ${pendingTransfers.length} pending transfers`);
    
    let eligibleEvents;
    if (isManualTransfer) {
      // Manual transfer: include published and completed events
      eligibleEvents = pendingTransfers.filter(ticket => {
        return ticket.eventId.status === 'published' || ticket.eventId.status === 'completed';
      });
      console.log(`${eligibleEvents.length} tickets are for published/completed events (manual transfer)`);
    } else {
      // Automated transfer: only completed events (end date passed)
      eligibleEvents = pendingTransfers.filter(ticket => {
        return new Date(ticket.eventId.endDate) < new Date();
      });
      console.log(`${eligibleEvents.length} tickets are for completed events (automated transfer)`);
    }
    
    const transferResults = [];
    
    for (const ticket of eligibleEvents) {
      // Initialize variables outside try block so they're accessible in catch block
      let transferAmount = ticket.organizerPayment;
      let ticketQuantity = ticket.quantity;
      
      try {
        console.log(`Processing transfer for ticket ${ticket._id}`);
        
        // For partially refunded tickets, calculate based on active tickets
        if (ticket.paymentStatus === 'partially_refunded' && ticket.ticketDetails) {
          const activeTickets = ticket.ticketDetails.filter(detail => detail.refundStatus !== 'completed');
          if (activeTickets.length > 0) {
            const organizerPaymentPerTicket = ticket.organizerPayment / ticket.quantity;
            transferAmount = activeTickets.length * organizerPaymentPerTicket;
            ticketQuantity = activeTickets.length;
            console.log(`Partially refunded ticket: ${activeTickets.length} active tickets out of ${ticket.quantity} total`);
          } else {
            console.log(`Ticket ${ticket._id} has no active tickets - skipping`);
            transferResults.push({
              ticketId: ticket._id,
              status: 'skipped',
              reason: 'No active tickets (all refunded)'
            });
            continue;
          }
        }
        
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
        
        console.log(`Creating transfer for ${transferAmount} CHF (${ticketQuantity} tickets)`);
        
        // Create transfer to organizer
        const transfer = await stripe.transfers.create({
          amount: Math.round(transferAmount * 100), // Convert to cents
          currency: ticket.currency.toLowerCase(),
          destination: ticket.organizer.stripeCustomerId,
          metadata: {
            ticketId: ticket._id.toString(),
            eventId: ticket.eventId._id.toString(),
            organizerId: ticket.organizer._id.toString(),
            activeTickets: ticketQuantity.toString()
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
          amount: transferAmount,
          activeTickets: ticketQuantity
        });
        
      } catch (transferError) {
        console.error(`Transfer failed for ticket ${ticket._id}:`, transferError);
        
        let errorMessage = transferError.message;
        let errorCode = 'TRANSFER_FAILED';
        
        // Handle specific Stripe errors
        if (transferError.code === 'insufficient_funds') {
          errorMessage = 'Insufficient funds in platform account';
          errorCode = 'INSUFFICIENT_FUNDS';
        } else if (transferError.code === 'account_invalid') {
          errorMessage = 'Organizer Stripe account is invalid or incomplete';
          errorCode = 'INVALID_ACCOUNT';
        } else if (transferError.code === 'currency_not_supported') {
          errorMessage = 'Currency not supported for transfer';
          errorCode = 'CURRENCY_NOT_SUPPORTED';
        } else if (transferError.code === 'amount_too_small') {
          errorMessage = 'Transfer amount is too small';
          errorCode = 'AMOUNT_TOO_SMALL';
        } else if (transferError.code === 'amount_too_large') {
          errorMessage = 'Transfer amount exceeds limits';
          errorCode = 'AMOUNT_TOO_LARGE';
        } else if (transferError.message && transferError.message.includes('service agreement')) {
          errorMessage = 'Organizer account service agreement issue. Please contact support.';
          errorCode = 'SERVICE_AGREEMENT_ISSUE';
        }
        
        // Mark transfer as failed
        ticket.organizerTransferStatus = 'failed';
        await ticket.save();
        
        transferResults.push({
          ticketId: ticket._id,
          status: 'failed',
          error: errorMessage,
          code: errorCode,
          amount: transferAmount
        });
      }
    }
    
    console.log('Transfer process completed');
    console.log('Results:', transferResults);
    
    
    return transferResults;
    
  } catch (error) {
    console.error('Transfer to organizers error:', error);
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