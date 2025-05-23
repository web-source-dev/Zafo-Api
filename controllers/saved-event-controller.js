const SavedEvent = require('../models/saved-event');
const Event = require('../models/event');
const mongoose = require('mongoose');

/**
 * Saved Event Controller
 * Handles operations related to saved/favorited events
 */
const savedEventController = {
  /**
   * Save an event for the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  saveEvent: async (req, res) => {
    try {
      const { eventId } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required'
        });
      }
      
      // Check if event exists
      const eventExists = await Event.exists({ _id: eventId });
      if (!eventExists) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if already saved
      const alreadySaved = await SavedEvent.findOne({
        user: req.user._id,
        event: eventId
      });
      
      if (alreadySaved) {
        return res.status(400).json({
          success: false,
          message: 'Event already saved'
        });
      }
      
      // Create new saved event
      const savedEvent = new SavedEvent({
        user: req.user._id,
        event: eventId
      });
      
      await savedEvent.save();
      
      res.status(201).json({
        success: true,
        message: 'Event saved successfully',
        data: savedEvent
      });
    } catch (error) {
      console.error('Save event error:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Event already saved'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to save event',
        error: error.message
      });
    }
  },
  
  /**
   * Unsave/remove an event for the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  unsaveEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      
      // Delete saved event
      const result = await SavedEvent.findOneAndDelete({
        user: req.user._id,
        event: eventId
      });
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Event not saved by this user'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Event unsaved successfully'
      });
    } catch (error) {
      console.error('Unsave event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unsave event',
        error: error.message
      });
    }
  },
  
  /**
   * Get all saved events for the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getSavedEvents: async (req, res) => {
    try {
      const { sort = '-savedAt', limit = 10, page = 1 } = req.query;
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Find saved events with populated event details
      const savedEvents = await SavedEvent.find({ user: req.user._id })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('event');
      
      // Get total count for pagination
      const total = await SavedEvent.countDocuments({ user: req.user._id });
      
      // Extract just the event data for cleaner response
      const events = savedEvents.map(saved => ({
        ...saved.event.toObject(),
        savedAt: saved.savedAt
      }));
      
      res.status(200).json({
        success: true,
        message: 'Saved events retrieved successfully',
        data: {
          events,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get saved events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve saved events',
        error: error.message
      });
    }
  },
  
  /**
   * Check if an event is saved by the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  checkSavedEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const savedEvent = await SavedEvent.findOne({
        user: req.user._id,
        event: eventId
      });
      
      res.status(200).json({
        success: true,
        data: {
          isSaved: !!savedEvent
        }
      });
    } catch (error) {
      console.error('Check saved event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check if event is saved',
        error: error.message
      });
    }
  }
};

module.exports = savedEventController; 