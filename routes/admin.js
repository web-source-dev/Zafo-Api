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
  getActivities
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

module.exports = router; 