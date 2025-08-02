/**
 * Payment Notification Email Templates
 * Sends notifications for payment events like successful payments, refunds, and transfers
 */

/**
 * Generate successful payment notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.eventTitle - Event title
 * @param {number} data.amount - Payment amount
 * @param {string} data.currency - Currency
 * @param {string} data.paymentId - Payment ID
 * @param {string} data.eventUrl - Event URL
 * @returns {string} - HTML email content
 */
const generateSuccessfulPaymentEmail = (data) => {
  const { userName, eventTitle, amount, currency, paymentId, eventUrl } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - Zafo</title>
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
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
        .payment-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .payment-details h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #dee2e6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #495057;
        }
        .detail-value {
          color: #6c757d;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .view-event-button {
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
        .view-event-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(83, 126, 95, 0.4);
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
        .info-box {
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
          .detail-row {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Payment Successful!</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            Great news! Your payment has been processed successfully. 
            Your event is now live and ready to accept ticket bookings.
          </div>
          
          <div class="success-box">
            <strong>✅ Payment Confirmed:</strong> Your platform fee payment has been received and processed.
          </div>
          
          <div class="payment-details">
            <h3>Payment Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event:</span>
              <span class="detail-value">${eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${currency} ${amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment ID:</span>
              <span class="detail-value">${paymentId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          
          <div class="info-box">
            <strong>🎉 What's Next?</strong> Your event is now published and visible to potential attendees. 
            You can start promoting it and managing ticket sales through your organizer dashboard.
          </div>
          
          <div class="button-container">
            <a href="${eventUrl}" class="view-event-button">
              View Your Event
            </a>
          </div>
          
          <div class="message">
            If you have any questions about your payment or need help managing your event, 
            please don't hesitate to contact our support team.
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
 * Generate failed payment notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.eventTitle - Event title
 * @param {number} data.amount - Payment amount
 * @param {string} data.currency - Currency
 * @param {string} data.errorMessage - Error message
 * @param {string} data.retryUrl - Retry payment URL
 * @returns {string} - HTML email content
 */
const generateFailedPaymentEmail = (data) => {
  const { userName, eventTitle, amount, currency, errorMessage, retryUrl } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed - Zafo</title>
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
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
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
        .error-box {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #721c24;
        }
        .payment-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .payment-details h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #dee2e6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #495057;
        }
        .detail-value {
          color: #6c757d;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .retry-button {
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
        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(83, 126, 95, 0.4);
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
        .help-box {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #856404;
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
          .detail-row {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Payment Failed</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            We're sorry, but your payment for the platform fee could not be processed. 
            Your event is currently unpublished until the payment is completed.
          </div>
          
          <div class="error-box">
            <strong>❌ Payment Failed:</strong> ${errorMessage || 'Your payment could not be processed. Please try again.'}
          </div>
          
          <div class="payment-details">
            <h3>Payment Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event:</span>
              <span class="detail-value">${eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${currency} ${amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          
          <div class="help-box">
            <strong>💡 Common Solutions:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Check that your card details are correct</li>
              <li>Ensure your card has sufficient funds</li>
              <li>Try using a different payment method</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>
          
          <div class="button-container">
            <a href="${retryUrl}" class="retry-button">
              Try Payment Again
            </a>
          </div>
          
          <div class="message">
            If you continue to experience issues, please contact our support team for assistance. 
            We're here to help you get your event published successfully.
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
 * Generate refund notification email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.eventTitle - Event title
 * @param {number} data.refundAmount - Refund amount
 * @param {string} data.currency - Currency
 * @param {string} data.refundId - Refund ID
 * @param {string} data.reason - Refund reason
 * @returns {string} - HTML email content
 */
const generateRefundEmail = (data) => {
  const { userName, eventTitle, refundAmount, currency, refundId, reason } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Processed - Zafo</title>
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
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
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
        .refund-box {
          background-color: #d1ecf1;
          border: 1px solid #bee5eb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #0c5460;
        }
        .refund-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .refund-details h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #dee2e6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #495057;
        }
        .detail-value {
          color: #6c757d;
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
        .timeline-box {
          background-color: #e2e3e5;
          border: 1px solid #d6d8db;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #383d41;
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
          .detail-row {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Refund Processed</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            Your refund request has been processed successfully. 
            The refunded amount will be credited back to your original payment method.
          </div>
          
          <div class="refund-box">
            <strong>💰 Refund Confirmed:</strong> Your refund has been processed and will appear in your account within 3-5 business days.
          </div>
          
          <div class="refund-details">
            <h3>Refund Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event:</span>
              <span class="detail-value">${eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Refund Amount:</span>
              <span class="detail-value">${currency} ${refundAmount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Refund ID:</span>
              <span class="detail-value">${refundId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>
            ${reason ? `
            <div class="detail-row">
              <span class="detail-label">Reason:</span>
              <span class="detail-value">${reason}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="timeline-box">
            <strong>📅 Processing Timeline:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Refund processed: Immediately</li>
              <li>Bank processing: 1-2 business days</li>
              <li>Funds available: 3-5 business days</li>
            </ul>
          </div>
          
          <div class="message">
            If you have any questions about your refund or don't see the funds in your account after 5 business days, 
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
const generateSuccessfulPaymentText = (data) => {
  const { userName, eventTitle, amount, currency, paymentId, eventUrl } = data;
  
  return `
Payment Successful - Zafo

Hello ${userName},

Great news! Your payment has been processed successfully. 
Your event is now live and ready to accept ticket bookings.

✅ Payment Confirmed: Your platform fee payment has been received and processed.

Payment Details:
• Event: ${eventTitle}
• Amount: ${currency} ${amount.toFixed(2)}
• Payment ID: ${paymentId}
• Date: ${new Date().toLocaleDateString()}

🎉 What's Next? Your event is now published and visible to potential attendees. 
You can start promoting it and managing ticket sales through your organizer dashboard.

View Your Event: ${eventUrl}

If you have any questions about your payment or need help managing your event, 
please don't hesitate to contact our support team.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generateFailedPaymentText = (data) => {
  const { userName, eventTitle, amount, currency, errorMessage, retryUrl } = data;
  
  return `
Payment Failed - Zafo

Hello ${userName},

We're sorry, but your payment for the platform fee could not be processed. 
Your event is currently unpublished until the payment is completed.

❌ Payment Failed: ${errorMessage || 'Your payment could not be processed. Please try again.'}

Payment Details:
• Event: ${eventTitle}
• Amount: ${currency} ${amount.toFixed(2)}
• Date: ${new Date().toLocaleDateString()}

💡 Common Solutions:
• Check that your card details are correct
• Ensure your card has sufficient funds
• Try using a different payment method
• Contact your bank if the issue persists

Try Payment Again: ${retryUrl}

If you continue to experience issues, please contact our support team for assistance. 
We're here to help you get your event published successfully.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generateRefundText = (data) => {
  const { userName, eventTitle, refundAmount, currency, refundId, reason } = data;
  
  return `
Refund Processed - Zafo

Hello ${userName},

Your refund request has been processed successfully. 
The refunded amount will be credited back to your original payment method.

💰 Refund Confirmed: Your refund has been processed and will appear in your account within 3-5 business days.

Refund Details:
• Event: ${eventTitle}
• Refund Amount: ${currency} ${refundAmount.toFixed(2)}
• Refund ID: ${refundId}
• Date: ${new Date().toLocaleDateString()}
${reason ? `• Reason: ${reason}` : ''}

📅 Processing Timeline:
• Refund processed: Immediately
• Bank processing: 1-2 business days
• Funds available: 3-5 business days

If you have any questions about your refund or don't see the funds in your account after 5 business days, 
please contact our support team.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

module.exports = {
  generateSuccessfulPaymentEmail,
  generateSuccessfulPaymentText,
  generateFailedPaymentEmail,
  generateFailedPaymentText,
  generateRefundEmail,
  generateRefundText
}; 
