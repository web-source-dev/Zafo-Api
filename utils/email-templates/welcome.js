/**
 * Welcome Email Template
 * Sends welcome email to newly registered users
 */

/**
 * Generate welcome email HTML
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.loginUrl - Login URL
 * @returns {string} - HTML email content
 */
const generateWelcomeEmail = (data) => {
  const { userName, loginUrl } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Zafo!</title>
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
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          margin-bottom: 20px;
          color: #333;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          margin-bottom: 30px;
          color: #666;
        }
        .features {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin: 30px 0;
        }
        .features h3 {
          color: #4a95eb;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .feature-list li {
          padding: 8px 0;
          color: #666;
          position: relative;
          padding-left: 25px;
        }
        .feature-list li:before {
          content: "✓";
          color: #4a95eb;
          font-weight: bold;
          position: absolute;
          left: 0;
        }
        .button-container {
          text-align: center;
          margin: 40px 0;
        }
        .login-button {
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
        .login-button:hover {
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
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .highlight {
          background-color: #d7efff;
          border: 1px solid #4a95eb;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #1390b6;
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
            padding: 30px 15px;
          }
          .header h1 {
            font-size: 28px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Zafo</div>
          <h1>Welcome to Zafo!</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Welcome, ${userName}! 🎉
          </div>
          
          <div class="message">
            Thank you for joining Zafo! We're excited to have you as part of our community. 
            You're now ready to discover amazing events and connect with people who share your interests.
          </div>
          
          <div class="highlight">
            <strong>🎯 What's next?</strong> Start exploring events in your area, 
            create your own events, or connect with organizers and attendees.
          </div>
          
          <div class="features">
            <h3>What you can do with Zafo:</h3>
            <ul class="feature-list">
              <li>Discover and book exciting events in your area</li>
              <li>Create and manage your own events</li>
              <li>Connect with event organizers and attendees</li>
              <li>Get personalized event recommendations</li>
              <li>Track your event history and preferences</li>
              <li>Receive notifications about upcoming events</li>
            </ul>
          </div>
          
          <div class="button-container">
            <a href="${loginUrl}" class="login-button">
              Start Exploring Events
            </a>
          </div>
          
          <div class="message">
            If you have any questions or need help getting started, 
            don't hesitate to reach out to our support team. We're here to help!
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Happy eventing!</strong></p>
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
 * Generate welcome email text version
 * @param {Object} data - Email data
 * @param {string} data.userName - User's first name
 * @param {string} data.loginUrl - Login URL
 * @returns {string} - Plain text email content
 */
const generateWelcomeText = (data) => {
  const { userName, loginUrl } = data;
  
  return `
Welcome to Zafo!

Welcome, ${userName}! 🎉

Thank you for joining Zafo! We're excited to have you as part of our community. 
You're now ready to discover amazing events and connect with people who share your interests.

🎯 What's next? Start exploring events in your area, create your own events, or connect with organizers and attendees.

What you can do with Zafo:
✓ Discover and book exciting events in your area
✓ Create and manage your own events
✓ Connect with event organizers and attendees
✓ Get personalized event recommendations
✓ Track your event history and preferences
✓ Receive notifications about upcoming events

Start exploring events: ${loginUrl}

If you have any questions or need help getting started, don't hesitate to reach out to our support team. We're here to help!

Happy eventing!
The Zafo Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
};

module.exports = {
  generateWelcomeEmail,
  generateWelcomeText
}; 
