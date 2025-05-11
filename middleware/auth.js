const { verifyToken, getTokenFromHeaders } = require('../utils/token');
const User = require('../models/user');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from headers
    const token = getTokenFromHeaders(req);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please log in.' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token. Please log in again.' 
      });
    }

    // Find user by ID
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive. Please contact support.' 
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Authorization middleware for admin-only routes
 * Must be used after authenticate middleware
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin permission required.' 
    });
  }
  next();
};

/**
 * Authorization middleware for organizer routes
 * Both admin and organizer roles can access
 * Must be used after authenticate middleware
 */
const authorizeOrganizer = (req, res, next) => {
  if (!req.user || (req.user.role !== 'organizer' && req.user.role !== 'admin')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Organizer permission required.' 
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeAdmin,
  authorizeOrganizer
};
