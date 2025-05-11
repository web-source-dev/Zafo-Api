const User = require('../models/user');
const mongoose = require('mongoose');

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

module.exports = {
  getStats,
  getSystemStatus,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  getActivities
}; 