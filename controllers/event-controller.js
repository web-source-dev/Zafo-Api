const Event = require('../models/event');
const Subscription = require('../models/subscription');
const Plan = require('../models/plan');
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
 * Checks if user has reached their event creation limits based on subscription
 * @param {string} userId - User ID
 * @param {Object} plan - User's subscription plan
 * @returns {Promise<Object>} Object with hasReachedLimit and message
 */
const checkEventCreationLimits = async (userId, plan) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  
  // Count events created in current month
  const monthlyCount = await Event.countDocuments({
    organizer: userId,
    createdAt: { $gte: startOfMonth }
  });
  
  // Count events created in current year
  const yearlyCount = await Event.countDocuments({
    organizer: userId,
    createdAt: { $gte: startOfYear }
  });
  
  // Free users can only create very limited events (e.g., 2 per month, 5 per year)
  if (!plan) {
    const freeMonthlyLimit = 2;
    const freeYearlyLimit = 5;
    
    if (monthlyCount >= freeMonthlyLimit) {
      return {
        hasReachedLimit: true,
        message: `Free users can only create ${freeMonthlyLimit} events per month. Please upgrade to a paid plan for more.`
      };
    }
    
    if (yearlyCount >= freeYearlyLimit) {
      return {
        hasReachedLimit: true,
        message: `Free users can only create ${freeYearlyLimit} events per year. Please upgrade to a paid plan for more.`
      };
    }
    
    return {
      hasReachedLimit: false
    };
  }
  
  // Check against plan limits
  if (monthlyCount >= plan.limits.monthlyEvents) {
    return {
      hasReachedLimit: true,
      message: `You have reached your limit of ${plan.limits.monthlyEvents} events this month on your ${plan.name} plan.`
    };
  }
  
  if (yearlyCount >= plan.limits.yearlyEvents) {
    return {
      hasReachedLimit: true,
      message: `You have reached your limit of ${plan.limits.yearlyEvents} events this year on your ${plan.name} plan.`
    };
  }
  
  return {
    hasReachedLimit: false
  };
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
      
      // Check subscription status and plan limits
      let subscriptionPlan = null;
      let subscription = null;
      
      if (req.user.isSubscribed) {
        // Get user's active subscription
        subscription = await Subscription.findOne({
          user: req.user._id,
          status: 'active'
        });
        
        if (subscription) {
          // Get the subscription plan
          subscriptionPlan = await Plan.findById(subscription.plan);
        }
      }
      
      // Check if user has reached their event limits
      const limitCheck = await checkEventCreationLimits(req.user._id, subscriptionPlan);
      if (limitCheck.hasReachedLimit) {
        return res.status(403).json({
          success: false,
          message: limitCheck.message
        });
      }
      
      // Apply plan-based restrictions to event data
      if (!subscriptionPlan) {
        // Free users get basic limitations
        eventData.isFree = true; // Force free events for non-subscribers
        
        // Limit certain fields to basic information only
        if (eventData.additionalFields && eventData.additionalFields.length > 0) {
          eventData.additionalFields = []; // Remove additional fields
        }
        
        if (eventData.seo) {
          eventData.seo = {
            metaTitle: eventData.title,
            metaDescription: eventData.smallDescription
          }; // Simplify SEO to basic information
        }
        
        // Limit speakers to just 1 for free users
        if (eventData.speakers && eventData.speakers.length > 1) {
          eventData.speakers = eventData.speakers.slice(0, 1);
        }
        
        // Restrict description length for free users
        if (eventData.aboutEvent && eventData.aboutEvent.length > 300) {
          eventData.aboutEvent = eventData.aboutEvent.substring(0, 300);
        }
        
        // Limit capacity for free users
        if (eventData.capacity > 50) {
          eventData.capacity = 50;
        }
        
        // Remove gallery images for free users
        if (eventData.galleryImages && eventData.galleryImages.length > 0) {
          eventData.galleryImages = [];
        }
        
        // Limit event duration to 1 day maximum for free users
        const startDate = new Date(eventData.startDate);
        const endDate = new Date(eventData.endDate);
        const maxDurationMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (endDate.getTime() - startDate.getTime() > maxDurationMs) {
          const newEndDate = new Date(startDate.getTime() + maxDurationMs);
          eventData.endDate = newEndDate;
        }
      } else {
        // Apply plan-specific restrictions
        if (!subscriptionPlan.limits.allowPricing) {
          eventData.isFree = true;
        }
        
        if (!subscriptionPlan.limits.allowDetailedDescription) {
          // Limit description length for lower-tier plans
          if (eventData.aboutEvent && eventData.aboutEvent.length > 500) {
            eventData.aboutEvent = eventData.aboutEvent.substring(0, 500);
          }
        }
        
        if (!subscriptionPlan.limits.allowAdvancedFeatures) {
          // Limit advanced features for lower-tier plans
          if (eventData.additionalFields && eventData.additionalFields.length > 1) {
            eventData.additionalFields = eventData.additionalFields.slice(0, 1);
          }
          
          if (eventData.speakers && eventData.speakers.length > 2) {
            eventData.speakers = eventData.speakers.slice(0, 2);
          }
        }
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
      
      // Check if ID is valid ObjectId or slug
      const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
      
      // Build query based on ID or slug
      const query = isObjectId 
        ? { _id: idOrSlug } 
        : { slug: idOrSlug };
      
      // Find event
      const event = await Event.findOne(query)
        .populate('organizer', 'firstName lastName email');
      
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
  
  /**
   * Get event counts for the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getEventCounts: async (req, res) => {
    try {
      const userId = req.user._id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      // Count events created in current month
      const monthlyCount = await Event.countDocuments({
        organizer: userId,
        createdAt: { $gte: startOfMonth }
      });
      
      // Count events created in current year
      const yearlyCount = await Event.countDocuments({
        organizer: userId,
        createdAt: { $gte: startOfYear }
      });
      
      res.status(200).json({
        success: true,
        data: {
          monthlyCount,
          yearlyCount
        }
      });
    } catch (error) {
      console.error('Get event counts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get event counts',
        error: error.message
      });
    }
  }
};

module.exports = eventController; 