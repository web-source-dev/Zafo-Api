const express = require('express');
const router = express.Router();
const { 
  getStats,
  getSystemStatus,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  getActivities,
  getSchedulerStatus,
  runTransferNow,
  startScheduler,
  stopScheduler,
  getOrganizers,
  getOrganizerStats,
  toggleOrganizerPaymentBlock,
  transferToOrganizer
} = require('../controllers/admin-controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin authorization
router.use(authenticate, authorizeAdmin);

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
router.get('/stats', getStats);

/**
 * @desc    Get system status
 * @route   GET /api/admin/system-status
 * @access  Private (Admin only)
 */
router.get('/system-status', getSystemStatus);

/**
 * @desc    Get users list with pagination and filters
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
router.get('/users', getUsers);

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin only)
 */
router.get('/users/:id', getUserById);

/**
 * @desc    Create new user
 * @route   POST /api/admin/users
 * @access  Private (Admin only)
 */
router.post('/users', createUser);

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin only)
 */
router.put('/users/:id', updateUser);

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
router.delete('/users/:id', deleteUser);

/**
 * @desc    Change user password
 * @route   PUT /api/admin/users/:id/password
 * @access  Private (Admin only)
 */
router.put('/users/:id/password', changeUserPassword);

/**
 * @desc    Get admin activities/audit logs
 * @route   GET /api/admin/activities
 * @access  Private (Admin only)
 */
router.get('/activities', getActivities);

/**
 * @desc    Get scheduler status
 * @route   GET /api/admin/scheduler/status
 * @access  Private (Admin only)
 */
router.get('/scheduler/status', getSchedulerStatus);

/**
 * @desc    Run transfer to organizers immediately
 * @route   POST /api/admin/scheduler/run-transfer
 * @access  Private (Admin only)
 */
router.post('/scheduler/run-transfer', runTransferNow);

/**
 * @desc    Start scheduler
 * @route   POST /api/admin/scheduler/start
 * @access  Private (Admin only)
 */
router.post('/scheduler/start', startScheduler);

/**
 * @desc    Stop scheduler
 * @route   POST /api/admin/scheduler/stop
 * @access  Private (Admin only)
 */
router.post('/scheduler/stop', stopScheduler);

/**
 * @desc    Get all organizers with payment stats
 * @route   GET /api/admin/organizers
 * @access  Private (Admin only)
 */
router.get('/organizers', getOrganizers);

/**
 * @desc    Get organizer payment stats
 * @route   GET /api/admin/organizers/:id/stats
 * @access  Private (Admin only)
 */
router.get('/organizers/:id/stats', getOrganizerStats);

/**
 * @desc    Block/unblock organizer payments
 * @route   PUT /api/admin/organizers/:id/payment-block
 * @access  Private (Admin only)
 */
router.put('/organizers/:id/payment-block', toggleOrganizerPaymentBlock);

/**
 * @desc    Manually transfer payment to organizer
 * @route   POST /api/admin/organizers/:id/transfer
 * @access  Private (Admin only)
 */
router.post('/organizers/:id/transfer', transferToOrganizer);

module.exports = router; 