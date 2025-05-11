const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event-controller');
const { authenticate, authorizeOrganizer } = require('../middleware/auth');

/**
 * @route   GET /api/events
 * @desc    Get all events (public route with filters)
 * @access  Public
 */
router.get('/', eventController.getEvents);

/**
 * @route   GET /api/events/organizer
 * @desc    Get events created by the current organizer
 * @access  Private (Organizer/Admin)
 */
router.get('/organizer', authenticate, authorizeOrganizer, eventController.getOrganizerEvents);

/**
 * @route   GET /api/events/:idOrSlug
 * @desc    Get event by ID or slug
 * @access  Public (with restrictions for non-public events)
 */
router.get('/:idOrSlug', eventController.getEvent);

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private (Organizer/Admin)
 */
router.post('/', authenticate, authorizeOrganizer, eventController.createEvent);

/**
 * @route   PUT /api/events/:id
 * @desc    Update an event
 * @access  Private (Organizer/Admin)
 */
router.put('/:id', authenticate, authorizeOrganizer, eventController.updateEvent);

/**
 * @route   PATCH /api/events/:id/status
 * @desc    Change event status
 * @access  Private (Organizer/Admin)
 */
router.patch('/:id/status', authenticate, authorizeOrganizer, eventController.changeEventStatus);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete an event
 * @access  Private (Organizer/Admin)
 */
router.delete('/:id', authenticate, authorizeOrganizer, eventController.deleteEvent);

module.exports = router; 