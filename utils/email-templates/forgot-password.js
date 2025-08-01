/**
 * Forgot Password Email Template
 * Sends password reset link to user
 */

/**
 * Generate forgot password email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.resetUrl - Password reset URL
 * @param {string} data.expiryTime - Expiry time (e.g., "1 hour")
 * @returns {string} - HTML email content
 */
const generateForgotPasswordEmail = (data) => {
  const { userName, resetUrl, expiryTime = "1 hour" } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request - Zafo</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #537e5f 0%, #424b3c 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #333;
        }
        .message {
          font-size: 16px;
          margin-bottom: 30px;
          color: #666;
        }
        .button-container {
          text-align: center;
          margin: 40px 0;
        }
        .reset-button {
          display: inline-block;
          background: linear-gradient(135deg, #537e5f 0%, #424b3c 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(83, 126, 95, 0.3);
        }
        .reset-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(83, 126, 95, 0.4);
        }
        .warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #856404;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 5px 0;
          color: #6c757d;
          font-size: 14px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .expiry-notice {
          background-color: #e3f2fd;
          border: 1px solid #bbdefb;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #1976d2;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 4px;
          }
          .content {
            padding: 20px 15px;
          }
          .header {
            padding: 20px 15px;
          }
          .header h1 {
            font-size: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            We received a request to reset the password for your Zafo account. 
            If you made this request, please click the button below to reset your password.
          </div>
          
          <div class="button-container">
            <a href="${resetUrl}" class="reset-button">
              Reset My Password
            </a>
          </div>
          
          <div class="expiry-notice">
            <strong>⚠️ Important:</strong> This link will expire in ${expiryTime}. 
            If you don't reset your password within this time, you'll need to request a new link.
          </div>
          
          <div class="warning">
            <strong>🔒 Security Notice:</strong> If you didn't request this password reset, 
            please ignore this email. Your account is secure and no action is required.
          </div>
          
          <div class="message">
            If the button above doesn't work, you can copy and paste this link into your browser:
            <br><br>
            <a href="${resetUrl}" style="color: #537e5f; word-break: break-all;">${resetUrl}</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Best regards,</strong></p>
          <p>The Zafo Team</p>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate forgot password email text version
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.resetUrl - Password reset URL
 * @param {string} data.expiryTime - Expiry time (e.g., "1 hour")
 * @returns {string} - Plain text email content
 */
const generateForgotPasswordText = (data) => {
  const { userName, resetUrl, expiryTime = "1 hour" } = data;
  
  return `
Password Reset Request - Zafo

Hello ${userName},

We received a request to reset the password for your Zafo account. 
If you made this request, please use the link below to reset your password:

${resetUrl}

IMPORTANT: This link will expire in ${expiryTime}. If you don't reset your password within this time, you'll need to request a new link.

SECURITY NOTICE: If you didn't request this password reset, please ignore this email. Your account is secure and no action is required.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

module.exports = {
  generateForgotPasswordEmail,
  generateForgotPasswordText
}; 