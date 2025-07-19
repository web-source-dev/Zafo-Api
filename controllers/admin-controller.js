const User = require('../models/user');
const mongoose = require('mongoose');
const schedulerService = require('../services/scheduler-service');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active users count
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Get new users created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    // In a real app, you might have a separate model for approvals
    // This is just a placeholder for demonstration
    const pendingApprovals = await User.countDocuments({ 
      isActive: false,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // last week
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersToday,
        pendingApprovals
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get system status
 * @route   GET /api/admin/system-status
 * @access  Private (Admin only)
 */
const getSystemStatus = async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1; // 1 means connected
    
    // In a real app, you would implement actual checks for various services
    // This is simplified for demonstration purposes
    const systemStatus = {
      api: true, // API server is running if this code executes
      database: dbStatus,
      authService: true,
      storageService: true
    };
    
    res.status(200).json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get users list with pagination and filters
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query filters
    const filter = {};
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    // Execute query with pagination
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/admin/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user'
    });
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role, isActive } = req.body;
    
    // Find and update user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      user.email = email;
    }
    
    // Update user fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    await user.remove();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/admin/users/:id/password
 * @access  Private (Admin only)
 */
const changeUserPassword = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.password = password;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get activities/audit logs
 * @route   GET /api/admin/activities
 * @access  Private (Admin only)
 */
const getActivities = async (req, res) => {
  try {
    // In a real app, you would have an Activity model
    // This is a placeholder that returns mock data
    
    const activities = [
      {
        _id: '1',
        userId: req.user._id,
        user: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        action: 'LOGIN',
        details: 'User logged in',
        ip: '127.0.0.1',
        createdAt: new Date()
      },
      {
        _id: '2',
        userId: req.user._id,
        user: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        action: 'UPDATE_USER',
        details: 'User profile updated',
        ip: '127.0.0.1',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];
    
    res.status(200).json({
      success: true,
      data: {
        activities,
        total: activities.length
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get scheduler status
 * @route   GET /api/admin/scheduler/status
 * @access  Private (Admin only)
 */
const getSchedulerStatus = async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Run transfer to organizers immediately
 * @route   POST /api/admin/scheduler/run-transfer
 * @access  Private (Admin only)
 */
const runTransferNow = async (req, res) => {
  try {
    const results = await schedulerService.runTransferNow();
    
    res.status(200).json({
      success: true,
      data: results,
      message: 'Transfer completed successfully'
    });
  } catch (error) {
    console.error('Run transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run transfer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Start scheduler
 * @route   POST /api/admin/scheduler/start
 * @access  Private (Admin only)
 */
const startScheduler = async (req, res) => {
  try {
    schedulerService.start();
    
    res.status(200).json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    console.error('Start scheduler error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start scheduler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Stop scheduler
 * @route   POST /api/admin/scheduler/stop
 * @access  Private (Admin only)
 */
const stopScheduler = async (req, res) => {
  try {
    schedulerService.stop();
    
    res.status(200).json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    console.error('Stop scheduler error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all organizers with payment stats
 * @route   GET /api/admin/organizers
 * @access  Private (Admin only)
 */
const getOrganizers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // First, find all users who have sold tickets (organizers)
    const Ticket = require('../models/ticket');
    
    // Get all unique organizer IDs from tickets
    const organizerIds = await Ticket.distinct('organizer');
    
    if (organizerIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          organizers: [],
          total: 0,
          page: parseInt(page),
          pages: 0
        }
      });
    }
    
    // Build query filters for users who are organizers
    const filter = { _id: { $in: organizerIds } };
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    // Execute query with pagination
    const organizers = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    // Get payment stats for each organizer
    const organizersWithStats = await Promise.all(
      organizers.map(async (organizer) => {
        const tickets = await Ticket.find({ organizer: organizer._id });
        
        const stats = {
          totalTickets: tickets.length,
          totalRevenue: 0,
          platformFees: 0,
          organizerPayments: 0,
          pendingTransfers: 0,
          completedTransfers: 0,
          failedTransfers: 0,
          totalSent: 0,
          totalRemaining: 0,
          hasStripeAccount: !!organizer.stripeCustomerId,
          transferStatus: 'none' // none, available, blocked, no_stripe
        };
        
        tickets.forEach(ticket => {
          if (ticket.paymentStatus === 'paid') {
            stats.totalRevenue += ticket.ticketPrice;
            stats.platformFees += ticket.platformFee;
            stats.organizerPayments += ticket.organizerPayment;
            
            if (ticket.organizerTransferStatus === 'pending') {
              stats.pendingTransfers++;
              stats.totalRemaining += ticket.organizerPayment;
            } else if (ticket.organizerTransferStatus === 'completed') {
              stats.completedTransfers++;
              stats.totalSent += ticket.organizerPayment;
            } else if (ticket.organizerTransferStatus === 'failed') {
              stats.failedTransfers++;
              stats.totalRemaining += ticket.organizerPayment;
            }
          }
        });
        
        // Determine transfer status
        if (organizer.isPaymentBlocked) {
          stats.transferStatus = 'blocked';
        } else if (!organizer.stripeCustomerId) {
          stats.transferStatus = 'no_stripe';
        } else if (stats.totalRemaining > 0) {
          stats.transferStatus = 'available';
        }
        
        return {
          ...organizer.toObject(),
          paymentStats: stats
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        organizers: organizersWithStats,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get organizers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get organizer payment stats
 * @route   GET /api/admin/organizers/:id/stats
 * @access  Private (Admin only)
 */
const getOrganizerStats = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }
    
    const Ticket = require('../models/ticket');
    const tickets = await Ticket.find({ organizer: organizer._id })
      .populate('eventId');
    
    const stats = {
      totalTickets: tickets.length,
      totalRevenue: 0,
      platformFees: 0,
      organizerPayments: 0,
      pendingTransfers: 0,
      completedTransfers: 0,
      failedTransfers: 0,
      totalSent: 0,
      totalRemaining: 0,
      recentTickets: []
    };
    
    tickets.forEach(ticket => {
      if (ticket.paymentStatus === 'paid') {
        stats.totalRevenue += ticket.ticketPrice;
        stats.platformFees += ticket.platformFee;
        stats.organizerPayments += ticket.organizerPayment;
        
        if (ticket.organizerTransferStatus === 'pending') {
          stats.pendingTransfers++;
          stats.totalRemaining += ticket.organizerPayment;
        } else if (ticket.organizerTransferStatus === 'completed') {
          stats.completedTransfers++;
          stats.totalSent += ticket.organizerPayment;
        } else if (ticket.organizerTransferStatus === 'failed') {
          stats.failedTransfers++;
          stats.totalRemaining += ticket.organizerPayment;
        }
      }
    });
    
    // Get recent tickets for this organizer
    stats.recentTickets = tickets
      .filter(ticket => ticket.paymentStatus === 'paid')
      .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))
      .slice(0, 10)
      .map(ticket => ({
        id: ticket._id,
        eventTitle: ticket.eventId.title,
        ticketPrice: ticket.ticketPrice,
        organizerPayment: ticket.organizerPayment,
        transferStatus: ticket.organizerTransferStatus,
        purchasedAt: ticket.purchasedAt
      }));
    
    res.status(200).json({
      success: true,
      data: {
        organizer,
        stats
      }
    });
  } catch (error) {
    console.error('Get organizer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizer stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Block/unblock organizer payments
 * @route   PUT /api/admin/organizers/:id/payment-block
 * @access  Private (Admin only)
 */
const toggleOrganizerPaymentBlock = async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;
    
    const organizer = await User.findById(req.params.id);
    
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }
    
    organizer.isPaymentBlocked = isBlocked;
    organizer.paymentBlockReason = isBlocked ? reason : null;
    organizer.paymentBlockedAt = isBlocked ? new Date() : null;
    
    await organizer.save();
    
    res.status(200).json({
      success: true,
      message: `Organizer payments ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: organizer
    });
  } catch (error) {
    console.error('Toggle organizer payment block error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organizer payment block status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Manually transfer payment to organizer
 * @route   POST /api/admin/organizers/:id/transfer
 * @access  Private (Admin only)
 */
const transferToOrganizer = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    
    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }
    
    // Check if organizer has Stripe account
    if (!organizer.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Organizer does not have a Stripe account set up. They need to complete Stripe Connect onboarding first.',
        code: 'NO_STRIPE_ACCOUNT'
      });
    }
    
    // Check if payments are blocked
    if (organizer.isPaymentBlocked) {
      return res.status(400).json({
        success: false,
        message: `Payments are blocked for this organizer. Reason: ${organizer.paymentBlockReason || 'No reason provided'}`,
        code: 'PAYMENTS_BLOCKED'
      });
    }
    
    const Ticket = require('../models/ticket');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Find pending transfers for this organizer
    const pendingTickets = await Ticket.find({
      organizer: organizer._id,
      paymentStatus: 'paid',
      organizerTransferStatus: 'pending'
    }).populate('eventId');
    
    const completedEvents = pendingTickets.filter(ticket => {
      return new Date(ticket.eventId.endDate) < new Date();
    });
    
    if (completedEvents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending transfers found for this organizer. All events must be completed before transfers can be processed.',
        code: 'NO_PENDING_TRANSFERS'
      });
    }
    
    const transferResults = [];
    let totalAmount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (const ticket of completedEvents) {
      try {
        totalAmount += ticket.organizerPayment;
        
        // Create transfer to organizer
        const transfer = await stripe.transfers.create({
          amount: Math.round(ticket.organizerPayment * 100), // Convert to cents
          currency: ticket.currency.toLowerCase(),
          destination: organizer.stripeCustomerId,
          metadata: {
            ticketId: ticket._id.toString(),
            eventId: ticket.eventId._id.toString(),
            organizerId: organizer._id.toString()
          }
        });
        
        // Update ticket transfer status
        ticket.organizerTransferStatus = 'completed';
        ticket.stripeTransferId = transfer.id;
        ticket.organizerTransferDate = new Date();
        await ticket.save();
        
        transferResults.push({
          ticketId: ticket._id,
          status: 'completed',
          transferId: transfer.id,
          amount: ticket.organizerPayment,
          message: 'Payment sent successfully'
        });
        
        successCount++;
        
      } catch (transferError) {
        console.error(`Transfer failed for ticket ${ticket._id}:`, transferError);
        
        let errorMessage = 'Transfer failed';
        let errorCode = 'TRANSFER_FAILED';
        
        // Handle specific Stripe errors
        if (transferError.code === 'insufficient_funds') {
          errorMessage = 'Insufficient funds in platform account';
          errorCode = 'INSUFFICIENT_FUNDS';
        } else if (transferError.code === 'account_invalid') {
          errorMessage = 'Organizer Stripe account is invalid or incomplete';
          errorCode = 'INVALID_ACCOUNT';
        } else if (transferError.code === 'currency_not_supported') {
          errorMessage = 'Currency not supported for transfer';
          errorCode = 'CURRENCY_NOT_SUPPORTED';
        } else if (transferError.code === 'amount_too_small') {
          errorMessage = 'Transfer amount is too small';
          errorCode = 'AMOUNT_TOO_SMALL';
        } else if (transferError.code === 'amount_too_large') {
          errorMessage = 'Transfer amount exceeds limits';
          errorCode = 'AMOUNT_TOO_LARGE';
        }
        
        // Mark transfer as failed
        ticket.organizerTransferStatus = 'failed';
        await ticket.save();
        
        transferResults.push({
          ticketId: ticket._id,
          status: 'failed',
          error: errorMessage,
          code: errorCode,
          amount: ticket.organizerPayment
        });
        
        failureCount++;
      }
    }
    
    // Determine overall success message
    let overallMessage = '';
    if (successCount > 0 && failureCount === 0) {
      overallMessage = `Payment sent successfully! Transferred CHF ${totalAmount.toFixed(2)} to ${organizer.firstName} ${organizer.lastName}`;
    } else if (successCount > 0 && failureCount > 0) {
      overallMessage = `Partial success: ${successCount} transfers completed, ${failureCount} failed. Total sent: CHF ${(totalAmount * successCount / completedEvents.length).toFixed(2)}`;
    } else {
      overallMessage = `All transfers failed. Please check the error details below.`;
    }
    
    res.status(200).json({
      success: successCount > 0,
      message: overallMessage,
      data: {
        totalProcessed: completedEvents.length,
        successCount,
        failureCount,
        totalAmount: totalAmount.toFixed(2),
        results: transferResults
      }
    });
  } catch (error) {
    console.error('Transfer to organizer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process transfer due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
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
}; 