/**
 * Admin Notification Email Templates
 * Sends notifications for admin actions like user deletion, password changes, and transfers
 */

/**
 * Generate user deletion notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.adminName - Admin's name
 * @param {string} data.reason - Reason for deletion (optional)
 * @returns {string} - HTML email content
 */
const generateUserDeletionEmail = (data) => {
  const { userName, adminName, reason } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Deletion Notice - Zafo</title>
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
        .warning {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #721c24;
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
        .contact-info {
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
          <h1>Account Deletion Notice</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            We regret to inform you that your Zafo account has been deleted by our administration team. 
            This action was taken by ${adminName} and is effective immediately.
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Your account and all associated data have been permanently removed from our system. 
            This includes your profile information, event history, and any saved preferences.
          </div>
          
          ${reason ? `
          <div class="message">
            <strong>Reason for deletion:</strong><br>
            ${reason}
          </div>
          ` : ''}
          
          <div class="contact-info">
            <strong>Need assistance?</strong><br>
            If you believe this action was taken in error or have any questions, 
            please contact our support team immediately. We're here to help.
          </div>
          
          <div class="message">
            Thank you for being part of the Zafo community. We wish you all the best in your future endeavors.
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
 * Generate password change notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.adminName - Admin's name
 * @param {string} data.newPassword - New password (optional, for admin-set passwords)
 * @returns {string} - HTML email content
 */
const generatePasswordChangeEmail = (data) => {
  const { userName, adminName, newPassword } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed - Zafo</title>
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
        .info-box {
          background-color: #d7efff;
          border: 1px solid #4a95eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #1390b6;
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
        .password-box {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
          font-family: monospace;
          font-size: 14px;
          color: #495057;
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
          <h1>Password Changed</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            Your Zafo account password has been changed by our administration team. 
            This action was performed by ${adminName}.
          </div>
          
          <div class="info-box">
            <strong>🔐 Security Notice:</strong> For your security, we recommend changing this password 
            to something you can remember easily after your next login.
          </div>
          
          ${newPassword ? `
          <div class="warning">
            <strong>📝 Your New Password:</strong><br>
            Please use this temporary password for your next login:
          </div>
          <div class="password-box">
            ${newPassword}
          </div>
          <div class="message">
            <strong>Important:</strong> Please change this password immediately after logging in for security purposes.
          </div>
          ` : `
          <div class="message">
            Your password has been successfully updated. You can now log in with your new password.
          </div>
          `}
          
          <div class="message">
            If you did not request this password change or have any concerns, 
            please contact our support team immediately.
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
 * Generate manual transfer notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.organizerName - Organizer's name
 * @param {string} data.adminName - Admin's name
 * @param {number} data.amount - Transfer amount
 * @param {string} data.currency - Currency
 * @param {number} data.successCount - Number of successful transfers
 * @param {number} data.failureCount - Number of failed transfers
 * @param {Array} data.results - Transfer results
 * @returns {string} - HTML email content
 */
const generateManualTransferEmail = (data) => {
  const { organizerName, adminName, amount, currency, successCount, failureCount, results } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Manual Payment Transfer - Zafo</title>
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
        .success-box {
          background-color: #d7efff;
          border: 1px solid #4a95eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #1390b6;
        }
        .warning-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #856404;
        }
        .error-box {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #721c24;
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
        .stats {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .stats h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .stat-item {
          text-align: center;
          padding: 10px;
          background-color: white;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #4a95eb;
        }
        .stat-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
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
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Manual Payment Transfer</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${organizerName},
          </div>
          
          <div class="message">
            A manual payment transfer has been initiated for your account by our administration team. 
            This action was performed by ${adminName}.
          </div>
          
          <div class="stats">
            <h3>Transfer Summary</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">${successCount}</div>
                <div class="stat-label">Successful</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${failureCount}</div>
                <div class="stat-label">Failed</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${currency} ${amount.toFixed(2)}</div>
                <div class="stat-label">Total Amount</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${successCount + failureCount}</div>
                <div class="stat-label">Total Transfers</div>
              </div>
            </div>
          </div>
          
          ${successCount > 0 ? `
          <div class="success-box">
            <strong>✅ Transfer Completed:</strong> ${successCount} payment(s) have been successfully transferred to your account.
          </div>
          ` : ''}
          
          ${failureCount > 0 ? `
          <div class="error-box">
            <strong>❌ Transfer Issues:</strong> ${failureCount} payment(s) failed to transfer. Please contact support for assistance.
          </div>
          ` : ''}
          
          <div class="message">
            You should see the transferred funds in your connected payment account within 1-3 business days, 
            depending on your payment processor.
          </div>
          
          <div class="warning-box">
            <strong>📧 Need Help?</strong> If you have any questions about this transfer or don't see the funds in your account, 
            please contact our support team.
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
 * Generate automated transfer notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.organizerName - Organizer's name
 * @param {number} data.amount - Transfer amount
 * @param {string} data.currency - Currency
 * @param {number} data.successCount - Number of successful transfers
 * @param {number} data.failureCount - Number of failed transfers
 * @returns {string} - HTML email content
 */
const generateAutomatedTransferEmail = (data) => {
  const { organizerName, amount, currency, successCount, failureCount } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Automated Payment Transfer - Zafo</title>
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
        .success-box {
          background-color: #d7efff;
          border: 1px solid #4a95eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #1390b6;
        }
        .warning-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #856404;
        }
        .error-box {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #721c24;
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
        .stats {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .stats h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .stat-item {
          text-align: center;
          padding: 10px;
          background-color: white;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #4a95eb;
        }
        .stat-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
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
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Automated Payment Transfer</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${organizerName},
          </div>
          
          <div class="message">
            Your scheduled payment transfer has been processed automatically by our system. 
            This is part of our regular payment processing schedule.
          </div>
          
          <div class="stats">
            <h3>Transfer Summary</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">${successCount}</div>
                <div class="stat-label">Successful</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${failureCount}</div>
                <div class="stat-label">Failed</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${currency} ${amount.toFixed(2)}</div>
                <div class="stat-label">Total Amount</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${successCount + failureCount}</div>
                <div class="stat-label">Total Transfers</div>
              </div>
            </div>
          </div>
          
          ${successCount > 0 ? `
          <div class="success-box">
            <strong>✅ Transfer Completed:</strong> ${successCount} payment(s) have been successfully transferred to your account.
          </div>
          ` : ''}
          
          ${failureCount > 0 ? `
          <div class="error-box">
            <strong>❌ Transfer Issues:</strong> ${failureCount} payment(s) failed to transfer. Our team will investigate and retry if possible.
          </div>
          ` : ''}
          
          <div class="message">
            You should see the transferred funds in your connected payment account within 1-3 business days, 
            depending on your payment processor.
          </div>
          
          <div class="warning-box">
            <strong>📧 Need Help?</strong> If you have any questions about this transfer or don't see the funds in your account, 
            please contact our support team.
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
 * Generate text versions of all emails
 */
const generateUserDeletionText = (data) => {
  const { userName, adminName, reason } = data;
  
  return `
Account Deletion Notice - Zafo

Hello ${userName},

We regret to inform you that your Zafo account has been deleted by our administration team. 
This action was taken by ${adminName} and is effective immediately.

⚠️ Important: Your account and all associated data have been permanently removed from our system. 
This includes your profile information, event history, and any saved preferences.

${reason ? `Reason for deletion: ${reason}` : ''}

Need assistance? If you believe this action was taken in error or have any questions, 
please contact our support team immediately. We're here to help.

Thank you for being part of the Zafo community. We wish you all the best in your future endeavors.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generatePasswordChangeText = (data) => {
  const { userName, adminName, newPassword } = data;
  
  return `
Password Changed - Zafo

Hello ${userName},

Your Zafo account password has been changed by our administration team. 
This action was performed by ${adminName}.

🔐 Security Notice: For your security, we recommend changing this password 
to something you can remember easily after your next login.

${newPassword ? `
📝 Your New Password: ${newPassword}

Important: Please change this password immediately after logging in for security purposes.
` : `
Your password has been successfully updated. You can now log in with your new password.
`}

If you did not request this password change or have any concerns, 
please contact our support team immediately.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generateManualTransferText = (data) => {
  const { organizerName, adminName, amount, currency, successCount, failureCount } = data;
  
  return `
Manual Payment Transfer - Zafo

Hello ${organizerName},

A manual payment transfer has been initiated for your account by our administration team. 
This action was performed by ${adminName}.

Transfer Summary:
• Successful transfers: ${successCount}
• Failed transfers: ${failureCount}
• Total amount: ${currency} ${amount.toFixed(2)}
• Total transfers: ${successCount + failureCount}

${successCount > 0 ? `✅ Transfer Completed: ${successCount} payment(s) have been successfully transferred to your account.` : ''}

${failureCount > 0 ? `❌ Transfer Issues: ${failureCount} payment(s) failed to transfer. Please contact support for assistance.` : ''}

You should see the transferred funds in your connected payment account within 1-3 business days, 
depending on your payment processor.

📧 Need Help? If you have any questions about this transfer or don't see the funds in your account, 
please contact our support team.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generateAutomatedTransferText = (data) => {
  const { organizerName, amount, currency, successCount, failureCount } = data;
  
  return `
Automated Payment Transfer - Zafo

Hello ${organizerName},

Your scheduled payment transfer has been processed automatically by our system. 
This is part of our regular payment processing schedule.

Transfer Summary:
• Successful transfers: ${successCount}
• Failed transfers: ${failureCount}
• Total amount: ${currency} ${amount.toFixed(2)}
• Total transfers: ${successCount + failureCount}

${successCount > 0 ? `✅ Transfer Completed: ${successCount} payment(s) have been successfully transferred to your account.` : ''}

${failureCount > 0 ? `❌ Transfer Issues: ${failureCount} payment(s) failed to transfer. Our team will investigate and retry if possible.` : ''}

You should see the transferred funds in your connected payment account within 1-3 business days, 
depending on your payment processor.

📧 Need Help? If you have any questions about this transfer or don't see the funds in your account, 
please contact our support team.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

module.exports = {
  generateUserDeletionEmail,
  generateUserDeletionText,
  generatePasswordChangeEmail,
  generatePasswordChangeText,
  generateManualTransferEmail,
  generateManualTransferText,
  generateAutomatedTransferEmail,
  generateAutomatedTransferText
}; 
