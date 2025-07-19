const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard overview
 * @access  Private
 */
router.get('/dashboard', userController.getDashboardOverview);

/**
 * @route   GET /api/user/tickets
 * @desc    Get user's ticket history with filters
 * @access  Private
 */
router.get('/tickets', userController.getTicketHistory);

/**
 * @route   GET /api/user/analytics
 * @desc    Get user's spending analytics
 * @access  Private
 */
router.get('/analytics', userController.getSpendingAnalytics);

/**
 * @route   GET /api/user/favorites
 * @desc    Get user's favorite events and categories
 * @access  Private
 */
router.get('/favorites', userController.getFavorites);

module.exports = router; 