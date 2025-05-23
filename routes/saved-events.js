const express = require('express');
const router = express.Router();
const savedEventController = require('../controllers/saved-event-controller');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/saved-events
 * @desc    Get all saved events for current user
 * @access  Private
 */
router.get('/', authenticate, savedEventController.getSavedEvents);

/**
 * @route   POST /api/saved-events
 * @desc    Save an event for current user
 * @access  Private
 */
router.post('/', authenticate, savedEventController.saveEvent);

/**
 * @route   DELETE /api/saved-events/:eventId
 * @desc    Unsave an event for current user
 * @access  Private
 */
router.delete('/:eventId', authenticate, savedEventController.unsaveEvent);

/**
 * @route   GET /api/saved-events/check/:eventId
 * @desc    Check if an event is saved by current user
 * @access  Private
 */
router.get('/check/:eventId', authenticate, savedEventController.checkSavedEvent);

module.exports = router; 