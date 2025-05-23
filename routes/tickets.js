const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket-controller');
const { authenticate, requireSubscription } = require('../middleware/auth');

/**
 * @route   POST /api/tickets/purchase
 * @desc    Initiate ticket purchase
 * @access  Private
 */
router.post('/purchase', authenticate, ticketController.initiateTicketPurchase);

/**
 * @route   POST /api/tickets/complete
 * @desc    Complete ticket purchase
 * @access  Private
 */
router.post('/complete', authenticate, ticketController.completeTicketPurchase);

/**
 * @route   GET /api/tickets
 * @desc    Get user's tickets
 * @access  Private
 */
router.get('/', authenticate, ticketController.getUserTickets);

/**
 * @route   GET /api/tickets/:id
 * @desc    Get ticket by ID
 * @access  Private
 */
router.get('/:id', authenticate, ticketController.getTicketById);

/**
 * @route   POST /api/tickets/validate
 * @desc    Validate a ticket (for event check-in)
 * @access  Private (Organizer/Admin)
 */
router.post('/validate', authenticate, ticketController.validateTicket);

/**
 * @route   PATCH /api/tickets/attendee
 * @desc    Update attendee information
 * @access  Private
 */
router.patch('/attendee', authenticate, ticketController.updateAttendeeInfo);

module.exports = router; 