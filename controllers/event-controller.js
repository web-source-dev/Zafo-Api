const Event = require('../models/event');
const mongoose = require('mongoose');

/**
 * Creates a slug from a title string
 * @param {string} title - Title to convert to slug
 * @returns {string} Slug
 */
const createSlugFromTitle = (title) => {
  // Create a slug from the title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
    
  // Add a timestamp to ensure uniqueness
  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
};

/**
 * Event Controller
 * Handles all event-related operations
 */
const eventController = {
  /**
   * Create a new event
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createEvent: async (req, res) => {
    try {
      const eventData = req.body;
      
      // Add organizer (current user) to event data
      eventData.organizer = req.user._id;
      
      // Generate slug if not provided
      if (!eventData.slug && eventData.title) {
        eventData.slug = createSlugFromTitle(eventData.title);
      }
      
      // Create new event
      const event = new Event(eventData);
      await event.save();
      
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('Create event error:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: validationErrors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create event',
        error: error.message
      });
    }
  },
  
  /**
   * Get all events with filtering options
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getEvents: async (req, res) => {
    try {
      const { 
        status, 
        category, 
        startDate, 
        endDate, 
        isPublic,
        sort = '-createdAt', // Default sort by newest
        limit = 10, 
        page = 1
      } = req.query;
      
      // Build filter object
      const filter = {};
      
      // Filter by status if provided
      if (status) {
        filter.status = status;
      }
      
      // Filter by category if provided
      if (category) {
        filter.category = category;
      }
      
      // Filter by date range if provided
      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) {
          filter.startDate.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.startDate.$lte = new Date(endDate);
        }
      }
      
      // Filter by visibility if provided
      if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
      }
      
      // If not admin/organizer, only return published events
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'organizer')) {
        filter.status = 'published';
        filter.isPublic = true;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Execute query with pagination and sorting
      const events = await Event.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('organizer', 'firstName lastName email');
      
      // Get total count for pagination
      const total = await Event.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        message: 'Events retrieved successfully',
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
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve events',
        error: error.message
      });
    }
  },
  
  /**
   * Get events created by the current organizer
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getOrganizerEvents: async (req, res) => {
    try {
      const { 
        status, 
        sort = '-createdAt', 
        limit = 10, 
        page = 1 
      } = req.query;
      
      // Build filter object
      const filter = {
        organizer: req.user._id
      };
      
      // Filter by status if provided
      if (status) {
        filter.status = status;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Execute query with pagination and sorting
      const events = await Event.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));
      
      // Get total count for pagination
      const total = await Event.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        message: 'Organizer events retrieved successfully',
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
      console.error('Get organizer events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve organizer events',
        error: error.message
      });
    }
  },
  
  /**
   * Get event by ID or slug
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getEvent: async (req, res) => {
    try {
      const { idOrSlug } = req.params;

      console.log(idOrSlug);
      
      // Check if ID is valid ObjectId or slug
      const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);

      console.log(isObjectId);
      
      // Build query based on ID or slug
      const query = isObjectId 
        ? { _id: idOrSlug } 
        : { slug: idOrSlug };

      console.log(query);
      
      // Find event
      const event = await Event.findOne(query)
        .populate('organizer', 'firstName lastName email');
      
      console.log(event);
      // If event not found
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });

      }
      
      // Check if user has permission to view non-public events
      if (!event.isPublic && 
          (!req.user || 
           (req.user.role !== 'admin' && 
            req.user._id.toString() !== event.organizer._id.toString()))) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this event'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Event retrieved successfully',
        data: event
      });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve event',
        error: error.message
      });
    }
  },
  
  /**
   * Update an event
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Find event
      const event = await Event.findById(id);
      
      // If event not found
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if user has permission (admin or organizer of this event)
      if (req.user.role !== 'admin' && 
          req.user._id.toString() !== event.organizer.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this event'
        });
      }
      
      // Validate the required fields are present
      if (updates.title && updates.title === '') {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }
      
      if (updates.smallDescription && updates.smallDescription === '') {
        return res.status(400).json({
          success: false,
          message: 'Small description is required'
        });
      }
      
      if (updates.aboutEvent && updates.aboutEvent === '') {
        return res.status(400).json({
          success: false,
          message: 'About event is required'
        });
      }
      
      // Update slug if title is updated
      if (updates.title && !updates.slug) {
        updates.slug = createSlugFromTitle(updates.title);
      }
      
      // Preserve payment status and prevent reverting to pending_payment
      if (event.isPaid && updates.status === 'pending_payment') {
        updates.status = event.status; // Keep the current status
        updates.isPaid = true; // Ensure isPaid remains true
      }
      
      // If the event is already paid, ensure it stays paid
      if (event.isPaid) {
        updates.isPaid = true;
        updates.paidAt = event.paidAt;
        updates.paymentId = event.paymentId;
      }
      
      // Update event
      const updatedEvent = await Event.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );
      
      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: updatedEvent
      });
    } catch (error) {
      console.error('Update event error:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: validationErrors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update event',
        error: error.message
      });
    }
  },
  
  /**
   * Delete an event
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Find event
      const event = await Event.findById(id);
      
      // If event not found
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if user has permission (admin or organizer of this event)
      if (req.user.role !== 'admin' && 
          req.user._id.toString() !== event.organizer.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this event'
        });
      }
      
      // Delete event
      await Event.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: error.message
      });
    }
  },
  
  /**
   * Change event status (publish, complete, cancel)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  changeEventStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['draft', 'published', 'canceled', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      // Find event
      const event = await Event.findById(id);
      
      // If event not found
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if user has permission (admin or organizer of this event)
      if (req.user.role !== 'admin' && 
          req.user._id.toString() !== event.organizer.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this event'
        });
      }
      
      // Update event status
      event.status = status;
      await event.save();
      
      res.status(200).json({
        success: true,
        message: `Event status changed to ${status}`,
        data: event
      });
    } catch (error) {
      console.error('Change event status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change event status',
        error: error.message
      });
    }
  },
};

module.exports = eventController; 