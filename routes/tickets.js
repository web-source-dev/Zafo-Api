const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket-controller');
const { authenticate, authorizeOrganizer } = require('../middleware/auth');

/**
 * @route   POST /api/tickets/purchase
 * @desc    Create a ticket purchase
 * @access  Private (Authenticated users)
 */
router.post('/purchase', authenticate, ticketController.createTicketPurchase);

/**
 * @route   POST /api/tickets/:ticketId/confirm
 * @desc    Confirm ticket payment
 * @access  Private (Authenticated users)
 */
router.post('/:ticketId/confirm', authenticate, ticketController.confirmTicketPayment);

/**
 * @route   POST /api/tickets/:ticketId/refund/request
 * @desc    Request ticket refund
 * @access  Private (Ticket owner or admin)
 */
router.post('/:ticketId/refund/request', authenticate, ticketController.requestTicketRefund);

/**
 * @route   POST /api/tickets/:ticketId/refund/process
 * @desc    Process ticket refund (approve/reject)
 * @access  Private (Organizer/Admin)
 */
router.post('/:ticketId/refund/process', authenticate, authorizeOrganizer, ticketController.processTicketRefund);

/**
 * @route   POST /api/tickets/transfer-to-organizers
 * @desc    Transfer money to organizers for completed events
 * @access  Private (Admin only)
 */
router.post('/transfer-to-organizers', authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, ticketController.transferToOrganizers);

/**
 * @route   GET /api/tickets/user
 * @desc    Get user's tickets
 * @access  Private (Authenticated users)
 */
router.get('/user', authenticate, ticketController.getUserTickets);

/**
 * @route   GET /api/tickets/organizer
 * @desc    Get organizer's ticket sales
 * @access  Private (Organizer/Admin)
 */
router.get('/organizer', authenticate, authorizeOrganizer, ticketController.getOrganizerTickets);

/**
 * @route   GET /api/tickets/refund-requests
 * @desc    Get all refund requests (admin only)
 * @access  Private (Admin only)
 */
router.get('/refund-requests', authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, ticketController.getAllRefundRequests);

/**
 * @route   GET /api/tickets/organizer/refund-requests
 * @desc    Get organizer's refund requests
 * @access  Private (Organizer/Admin)
 */
router.get('/organizer/refund-requests', authenticate, authorizeOrganizer, ticketController.getOrganizerRefundRequests);

module.exports = router; 