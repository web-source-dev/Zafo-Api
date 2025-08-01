/**
 * User Notification Email Templates
 * Sends notifications for user actions like ticket purchases, refunds, and account updates
 */

/**
 * Generate successful ticket purchase email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.eventTitle - Event title
 * @param {string} data.eventDate - Event date
 * @param {string} data.eventLocation - Event location
 * @param {number} data.quantity - Number of tickets
 * @param {number} data.totalAmount - Total amount paid
 * @param {string} data.currency - Currency
 * @param {Array} data.ticketDetails - Ticket details with ticket numbers
 * @param {string} data.eventUrl - Event URL
 * @returns {string} - HTML email content
 */
const generateTicketPurchaseEmail = (data) => {
  const { userName, eventTitle, eventDate, eventLocation, quantity, totalAmount, currency, ticketDetails, eventUrl } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Purchase Confirmation - Zafo</title>
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
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #155724;
        }
        .ticket-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .ticket-details h3 {
          color: #537e5f;
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
        .ticket-list {
          background-color: #e8f5e8;
          border: 1px solid #c3e6c3;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
        }
        .ticket-item {
          padding: 10px;
          margin: 5px 0;
          background-color: white;
          border-radius: 4px;
          border-left: 4px solid #537e5f;
        }
        .ticket-number {
          font-family: monospace;
          font-weight: bold;
          color: #537e5f;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .view-event-button {
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
          <h1>Ticket Purchase Confirmation</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            Great news! Your ticket purchase has been confirmed. 
            You're all set to attend the event. Here are your ticket details:
          </div>
          
          <div class="success-box">
            <strong>✅ Purchase Confirmed:</strong> Your tickets have been successfully purchased and are ready for the event.
          </div>
          
          <div class="ticket-details">
            <h3>Event Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event:</span>
              <span class="detail-value">${eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date(eventDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Location:</span>
              <span class="detail-value">${eventLocation}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Quantity:</span>
              <span class="detail-value">${quantity} ticket(s)</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value">${currency} ${totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="ticket-list">
            <h4>Your Tickets:</h4>
            ${ticketDetails.map(ticket => `
              <div class="ticket-item">
                <div><strong>${ticket.attendeeName}</strong></div>
                <div class="ticket-number">Ticket #: ${ticket.ticketNumber}</div>
                <div>Email: ${ticket.attendeeEmail}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="info-box">
            <strong>📅 Important:</strong> Please arrive at least 15 minutes before the event starts. 
            You may be asked to show your ticket number or confirmation email at the entrance.
          </div>
          
          <div class="button-container">
            <a href="${eventUrl}" class="view-event-button">
              View Event Details
            </a>
          </div>
          
          <div class="message">
            If you have any questions about your tickets or need to make changes, 
            please contact the event organizer or our support team.
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
 * Generate refund request email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.eventTitle - Event title
 * @param {string} data.eventDate - Event date
 * @param {number} data.quantity - Number of tickets being refunded
 * @param {number} data.refundAmount - Refund amount
 * @param {string} data.currency - Currency
 * @param {string} data.reason - Refund reason
 * @param {Array} data.refundedTickets - Array of refunded ticket details
 * @returns {string} - HTML email content
 */
const generateRefundRequestEmail = (data) => {
  const { userName, eventTitle, eventDate, quantity, refundAmount, currency, reason, refundedTickets } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Request Submitted - Zafo</title>
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
        .info-box {
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
          color: #537e5f;
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
        .ticket-list {
          background-color: #e8f5e8;
          border: 1px solid #c3e6c3;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
        }
        .ticket-item {
          padding: 10px;
          margin: 5px 0;
          background-color: white;
          border-radius: 4px;
          border-left: 4px solid #537e5f;
        }
        .ticket-number {
          font-family: monospace;
          font-weight: bold;
          color: #537e5f;
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
          <h1>Refund Request Submitted</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${userName},
          </div>
          
          <div class="message">
            Your refund request has been submitted successfully. 
            We're reviewing your request and will process it as soon as possible.
          </div>
          
          <div class="info-box">
            <strong>📋 Refund Request Received:</strong> Your refund request is now under review by the event organizer.
          </div>
          
          <div class="refund-details">
            <h3>Refund Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event:</span>
              <span class="detail-value">${eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Event Date:</span>
              <span class="detail-value">${new Date(eventDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tickets Refunding:</span>
              <span class="detail-value">${quantity} ticket(s)</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Refund Amount:</span>
              <span class="detail-value">${currency} ${refundAmount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Reason:</span>
              <span class="detail-value">${reason}</span>
            </div>
          </div>
          
          <div class="ticket-list">
            <h4>Tickets Being Refunded:</h4>
            ${refundedTickets.map(ticket => `
              <div class="ticket-item">
                <div><strong>${ticket.attendeeName}</strong></div>
                <div class="ticket-number">Ticket #: ${ticket.ticketNumber}</div>
                <div>Email: ${ticket.attendeeEmail}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="timeline-box">
            <strong>📅 Processing Timeline:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Review period: 1-3 business days</li>
              <li>Refund processing: 1-2 business days</li>
              <li>Funds available: 3-5 business days</li>
            </ul>
          </div>
          
          <div class="message">
            You will receive an email notification once your refund has been processed. 
            If you have any questions, please contact our support team.
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
 * Generate event creation email HTML
 * @param {Object} data - Email data
 * @param {string} data.organizerName - Organizer's first name
 * @param {string} data.eventTitle - Event title
 * @param {string} data.eventDate - Event date
 * @param {string} data.eventUrl - Event URL
 * @param {string} data.paymentUrl - Payment URL for platform fee
 * @returns {string} - HTML email content
 */
const generateEventCreationEmail = (data) => {
  const { organizerName, eventTitle, eventDate, eventUrl, paymentUrl } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Created Successfully - Zafo</title>
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
        .success-box {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          color: #155724;
        }
        .event-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .event-details h3 {
          color: #537e5f;
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
        .button {
          display: inline-block;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          margin: 0 10px;
        }
        .primary-button {
          background: linear-gradient(135deg, #537e5f 0%, #424b3c 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(83, 126, 95, 0.3);
        }
        .primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(83, 126, 95, 0.4);
        }
        .secondary-button {
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
        }
        .secondary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(108, 117, 125, 0.4);
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
          .button-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .button {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Event Created Successfully</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${organizerName},
          </div>
          
          <div class="message">
            Congratulations! Your event has been created successfully. 
            It's now in draft mode and ready for you to review and publish.
          </div>
          
          <div class="success-box">
            <strong>✅ Event Created:</strong> Your event is now saved and ready for the next steps.
          </div>
          
          <div class="event-details">
            <h3>Event Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event Title:</span>
              <span class="detail-value">${eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Event Date:</span>
              <span class="detail-value">${new Date(eventDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">Draft (Ready to Publish)</span>
            </div>
          </div>
          
          <div class="info-box">
            <strong>📋 Next Steps:</strong> To make your event visible to attendees, you'll need to:
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Review and finalize your event details</li>
              <li>Pay the platform fee (if applicable)</li>
              <li>Publish your event</li>
            </ol>
          </div>
          
          <div class="button-container">
            <a href="${eventUrl}" class="button primary-button">
              View Event
            </a>
            ${paymentUrl ? `
            <a href="${paymentUrl}" class="button secondary-button">
              Pay Platform Fee
            </a>
            ` : ''}
          </div>
          
          <div class="message">
            Once published, your event will be visible to potential attendees and you can start selling tickets. 
            If you need any help, our support team is here to assist you.
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
const generateTicketPurchaseText = (data) => {
  const { userName, eventTitle, eventDate, eventLocation, quantity, totalAmount, currency, ticketDetails, eventUrl } = data;
  
  return `
Ticket Purchase Confirmation - Zafo

Hello ${userName},

Great news! Your ticket purchase has been confirmed. 
You're all set to attend the event. Here are your ticket details:

✅ Purchase Confirmed: Your tickets have been successfully purchased and are ready for the event.

Event Details:
• Event: ${eventTitle}
• Date: ${new Date(eventDate).toLocaleDateString()}
• Location: ${eventLocation}
• Quantity: ${quantity} ticket(s)
• Total Amount: ${currency} ${totalAmount.toFixed(2)}

Your Tickets:
${ticketDetails.map(ticket => `
- ${ticket.attendeeName}
  Ticket #: ${ticket.ticketNumber}
  Email: ${ticket.attendeeEmail}
`).join('')}

📅 Important: Please arrive at least 15 minutes before the event starts. 
You may be asked to show your ticket number or confirmation email at the entrance.

View Event Details: ${eventUrl}

If you have any questions about your tickets or need to make changes, 
please contact the event organizer or our support team.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generateRefundRequestText = (data) => {
  const { userName, eventTitle, eventDate, quantity, refundAmount, currency, reason, refundedTickets } = data;
  
  return `
Refund Request Submitted - Zafo

Hello ${userName},

Your refund request has been submitted successfully. 
We're reviewing your request and will process it as soon as possible.

📋 Refund Request Received: Your refund request is now under review by the event organizer.

Refund Details:
• Event: ${eventTitle}
• Event Date: ${new Date(eventDate).toLocaleDateString()}
• Tickets Refunding: ${quantity} ticket(s)
• Refund Amount: ${currency} ${refundAmount.toFixed(2)}
• Reason: ${reason}

Tickets Being Refunded:
${refundedTickets.map(ticket => `
- ${ticket.attendeeName}
  Ticket #: ${ticket.ticketNumber}
  Email: ${ticket.attendeeEmail}
`).join('')}

📅 Processing Timeline:
• Review period: 1-3 business days
• Refund processing: 1-2 business days
• Funds available: 3-5 business days

You will receive an email notification once your refund has been processed. 
If you have any questions, please contact our support team.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

const generateEventCreationText = (data) => {
  const { organizerName, eventTitle, eventDate, eventUrl, paymentUrl } = data;
  
  return `
Event Created Successfully - Zafo

Hello ${organizerName},

Congratulations! Your event has been created successfully. 
It's now in draft mode and ready for you to review and publish.

✅ Event Created: Your event is now saved and ready for the next steps.

Event Details:
• Event Title: ${eventTitle}
• Event Date: ${new Date(eventDate).toLocaleDateString()}
• Status: Draft (Ready to Publish)

📋 Next Steps: To make your event visible to attendees, you'll need to:
1. Review and finalize your event details
2. Pay the platform fee (if applicable)
3. Publish your event

View Event: ${eventUrl}
${paymentUrl ? `Pay Platform Fee: ${paymentUrl}` : ''}

Once published, your event will be visible to potential attendees and you can start selling tickets. 
If you need any help, our support team is here to assist you.

Best regards,
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

module.exports = {
  generateTicketPurchaseEmail,
  generateTicketPurchaseText,
  generateRefundRequestEmail,
  generateRefundRequestText,
  generateEventCreationEmail,
  generateEventCreationText
}; 