const nodemailer = require('nodemailer');

/**
 * Global Email Utility
 * Handles email configuration and sending functionality
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send email with template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content (optional)
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags to create plain text version
   * @param {string} html - HTML content
   * @returns {string} - Plain text content
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} - Whether email is properly configured
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection verification failed:', error);
      return false;
    }
  }

  /**
   * Get email configuration status
   * @returns {Object} - Configuration status
   */
  getConfigStatus() {
    return {
      emailService: process.env.EMAIL_SERVICE || 'gmail',
      emailUser: process.env.EMAIL_USER ? 'Configured' : 'Not configured',
      emailPass: process.env.EMAIL_PASS ? 'Configured' : 'Not configured',
      transporter: this.transporter ? 'Initialized' : 'Not initialized'
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService; 