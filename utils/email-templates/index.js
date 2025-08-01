/**
 * Email Templates Index
 * Exports all email templates for easy importing
 */

const forgotPasswordTemplate = require('./forgot-password');
const welcomeTemplate = require('./welcome');
const emailVerificationTemplate = require('./email-verification');
const adminNotificationsTemplate = require('./admin-notifications');
const paymentNotificationsTemplate = require('./payment-notifications');
const userNotificationsTemplate = require('./user-notifications');

module.exports = {
  forgotPassword: forgotPasswordTemplate,
  welcome: welcomeTemplate,
  emailVerification: emailVerificationTemplate,
  adminNotifications: adminNotificationsTemplate,
  paymentNotifications: paymentNotificationsTemplate,
  userNotifications: userNotificationsTemplate
}; 