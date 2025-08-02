/**
 * Email Verification Template
 * Sends email verification link to users
 */

/**
 * Generate email verification HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.verificationUrl - Email verification URL
 * @param {string} data.expiryTime - Expiry time (e.g., "24 hours")
 * @returns {string} - HTML email content
 */
const generateEmailVerificationEmail = (data) => {
  const { userName, verificationUrl, expiryTime = "24 hours" } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Zafo</title>
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
          background: linear-gradient(135deg, #4a95eb 0%, #1390b6 100%);
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
        .verify-button {
          display: inline-block;
          background: linear-gradient(135deg, #4a95eb 0%, #1390b6 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(83, 126, 95, 0.3);
        }
        .verify-button:hover {
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
        .benefits {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .benefits h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .benefits ul {
          margin: 0;
          padding-left: 20px;
          color: #666;
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
          <h1>Verify Your Email Address</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            Thank you for signing up for Zafo! To complete your registration and start exploring amazing events, 
            please verify your email address by clicking the button below.
          </div>
          
          <div class="button-container">
            <a href="${verificationUrl}" class="verify-button">
              Verify Email Address
            </a>
          </div>
          
          <div class="expiry-notice">
            <strong>⚠️ Important:</strong> This verification link will expire in ${expiryTime}. 
            If you don't verify your email within this time, you'll need to request a new verification link.
          </div>
          
          <div class="benefits">
            <h3>Why verify your email?</h3>
            <ul>
              <li>Access to all Zafo features and events</li>
              <li>Receive important notifications about your events</li>
              <li>Reset your password if needed</li>
              <li>Enhanced account security</li>
            </ul>
          </div>
          
          <div class="warning">
            <strong>🔒 Security Notice:</strong> If you didn't create a Zafo account, 
            please ignore this email. Your email address may have been entered by mistake.
          </div>
          
          <div class="message">
            If the button above doesn't work, you can copy and paste this link into your browser:
            <br><br>
            <a href="${verificationUrl}" style="color: #4a95eb; word-break: break-all;">${verificationUrl}</a>
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
 * Generate email verification text version
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.verificationUrl - Email verification URL
 * @param {string} data.expiryTime - Expiry time (e.g., "24 hours")
 * @returns {string} - Plain text email content
 */
const generateEmailVerificationText = (data) => {
  const { userName, verificationUrl, expiryTime = "24 hours" } = data;
  
  return `
Verify Your Email Address - Zafo

Hello ${userName},

Thank you for signing up for Zafo! To complete your registration and start exploring amazing events, 
please verify your email address by clicking the link below:

${verificationUrl}

IMPORTANT: This verification link will expire in ${expiryTime}. If you don't verify your email within this time, you'll need to request a new verification link.

Why verify your email?
• Access to all Zafo features and events
• Receive important notifications about your events
• Reset your password if needed
• Enhanced account security

SECURITY NOTICE: If you didn't create a Zafo account, please ignore this email. Your email address may have been entered by mistake.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

module.exports = {
  generateEmailVerificationEmail,
  generateEmailVerificationText
}; 
