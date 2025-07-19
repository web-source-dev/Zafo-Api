const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getCurrentUser, 
  updateProfile,
  changePassword,
  deleteAccount
} = require('../controllers/auth-controller');
const { authenticate } = require('../middleware/auth');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post('/register', register);

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post('/login', login);

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private (requires authentication)
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private (requires authentication)
 */
router.put('/me', authenticate, updateProfile);

/**
 * @desc    Change user password
 * @route   POST /api/auth/change-password
 * @access  Private (requires authentication)
 */
router.post('/change-password', authenticate, changePassword);

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/delete-account
 * @access  Private (requires authentication)
 */
router.delete('/delete-account', authenticate, deleteAccount);

/**
 * @desc    Verify token (useful for frontend to check token validity)
 * @route   GET /api/auth/verify
 * @access  Private (requires authentication)
 */
router.get('/verify', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: {
      _id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      phone: req.user.phone,
      role: req.user.role
    }
  });
});

module.exports = router;
