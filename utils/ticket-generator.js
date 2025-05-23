const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { uploadPdfBuffer } = require('./cloudinary');
const Ticket = require('../models/ticket');

/**
 * Generate a QR code as a data URL
 * @param {String} data - Data to encode in QR code
 * @returns {Promise<String>} QR code data URL
 */
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#4A6741',  // Sage green for QR code
        light: '#FFFFFF'  // White background
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate a PDF ticket for an order
 * @param {Object} ticketOrder - Ticket order document
 * @param {Object} event - Event document
 * @param {Object} user - User document
 * @returns {Promise<{buffer: Buffer, url: String}>} PDF buffer and Cloudinary URL
 */
const generateTicketPDF = async (ticketOrder, event, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Event Tickets - ${event.title}`,
          Author: 'Zafo Events',
          Subject: `Tickets for ${event.title}`,
          Keywords: 'ticket, event, zafo'
        }
      });

      // Buffer to store PDF data
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          // Combine chunks into a single buffer
          const pdfBuffer = Buffer.concat(chunks);
          
          // Upload to Cloudinary
          const publicId = `ticket-${ticketOrder._id}-${Date.now()}`;
          const uploadResult = await uploadPdfBuffer(pdfBuffer, publicId);
          
          // Update ticket order with PDF URL
          await Ticket.findByIdAndUpdate(ticketOrder._id, {
            pdfUrl: uploadResult.secure_url
          });

          // Also update individual ticket QR code URLs if they haven't been set
          const ticketOrder = await Ticket.findById(ticketOrder._id);
          let updated = false;
          
          for (let i = 0; i < ticketOrder.tickets.length; i++) {
            if (!ticketOrder.tickets[i].qrCodeUrl) {
              // Generate QR code data URL
              const qrData = JSON.stringify({
                ticketNumber: ticketOrder.tickets[i].ticketNumber
              });
              
              const qrCodeUrl = await generateQRCode(qrData);
              ticketOrder.tickets[i].qrCodeUrl = qrCodeUrl;
              updated = true;
            }
          }
          
          if (updated) {
            await ticketOrder.save();
          }
          
          // Return buffer and URL
          resolve({
            buffer: pdfBuffer,
            url: uploadResult.secure_url
          });
        } catch (error) {
          reject(error);
        }
      });

      // Set up the document with branding
      // Cover page
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f7f5f0'); // Light taupe background
      
      // Header with logo
      doc.fontSize(30)
         .fillColor('#4A6741') // Sage green color
         .text('ZAFO EVENTS', 50, 70, { align: 'center' })
         .fontSize(16)
         .fillColor('#666')
         .text('OFFICIAL TICKET', { align: 'center' })
         .moveDown(1);
      
      // Event title
      doc.fontSize(24)
         .fillColor('#000')
         .text(`${event.title}`, { align: 'center' })
         .moveDown(1);
      
      // Decorative line
      doc.moveTo(100, doc.y)
         .lineTo(doc.page.width - 100, doc.y)
         .stroke('#4A6741')
         .moveDown(1);
      
      // Add order information
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Order #: ${ticketOrder.orderNumber}`, { align: 'center' })
         .text(`Purchase Date: ${new Date(ticketOrder.createdAt).toLocaleDateString()}`, { align: 'center' })
         .text(`Ticket Quantity: ${ticketOrder.quantity}`, { align: 'center' })
         .moveDown(2);

      // Add event information
      doc.fontSize(14)
         .fillColor('#4A6741')
         .text('EVENT DETAILS', { align: 'center' })
         .moveDown(0.5);
      
      // Create a box for event details
      const boxY = doc.y;
      doc.roundedRect(100, boxY, doc.page.width - 200, 100, 5).fillAndStroke('#f9f9f9', '#4A6741');
      
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Date: ${new Date(event.startDate).toLocaleDateString()}`, 120, boxY + 20)
         .text(`Time: ${new Date(event.startDate).toLocaleTimeString()} - ${new Date(event.endDate).toLocaleTimeString()}`, 120, boxY + 40)
         .text(`Location: ${event.location.name}, ${event.location.address.city}`, 120, boxY + 60)
         .moveDown(5);

      // Add user information
      doc.fontSize(14)
         .fillColor('#4A6741')
         .text('PURCHASER INFORMATION', { align: 'center' })
         .moveDown(0.5);
      
      // Create a box for purchaser details
      const purchaserBoxY = doc.y;
      doc.roundedRect(100, purchaserBoxY, doc.page.width - 200, 60, 5).fillAndStroke('#f9f9f9', '#4A6741');
      
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Name: ${user.firstName} ${user.lastName}`, 120, purchaserBoxY + 20)
         .text(`Email: ${user.email}`, 120, purchaserBoxY + 40)
         .moveDown(2);
         
      // Add footer
      const footerY = doc.page.height - 50;
      doc.fontSize(9)
         .fillColor('#666')
         .text('Powered by Zafo Events', 50, footerY, { align: 'center' })
         .text('This document serves as proof of purchase.', { align: 'center' });
      
      // Add page break before tickets
      doc.addPage();

      // Generate individual tickets
      for (let i = 0; i < ticketOrder.tickets.length; i++) {
        const ticket = ticketOrder.tickets[i];
        
        // Add page break if not the first ticket and at the start of a new ticket
        if (i > 0) {
          doc.addPage();
        }
        
        // Generate QR code with simplified ticket data (just ticket number)
        const qrData = JSON.stringify({
          ticketNumber: ticket.ticketNumber
        });
        
        const qrDataUrl = await generateQRCode(qrData);
        
        // Save QR code URL to ticket
        if (!ticket.qrCodeUrl) {
          ticket.qrCodeUrl = qrDataUrl;
        }
        
        // Background color
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f7f5f0');
        
        // Draw ticket border with rounded corners
        doc.roundedRect(50, 50, doc.page.width - 100, doc.page.height - 100, 10)
           .fillAndStroke('#fff', '#4A6741');
        
        // Add zafo branding at the top
        doc.fontSize(20)
           .fillColor('#4A6741')
           .text('ZAFO EVENTS', 70, 70, { align: 'center', width: doc.page.width - 140 })
           .moveDown(0.2);
           
        // Add "ADMIT ONE" badge
        doc.rect(doc.page.width - 150, 70, 80, 30).fill('#4A6741');
        doc.fontSize(12)
           .fillColor('#fff')
           .text('ADMIT ONE', doc.page.width - 150, 79, { align: 'center', width: 80 });
           
        // Add ticket header
        doc.fontSize(16)
           .fillColor('#4A6741')
           .text('ADMISSION TICKET', 70, 110, { align: 'center', width: doc.page.width - 140 })
           .moveDown(0.5);
           
        // Add ticket number in a badge
        const ticketNumY = doc.y;
        doc.roundedRect(doc.page.width/2 - 100, ticketNumY, 200, 25, 12).fill('#4A6741');
        doc.fontSize(12)
           .fillColor('#fff')
           .text(`Ticket #${ticket.ticketNumber}`, doc.page.width/2 - 100, ticketNumY + 7, { align: 'center', width: 200 })
           .moveDown(1.5);
        
        // Add event info in a nicely formatted box
        const eventInfoY = doc.y;
        doc.roundedRect(70, eventInfoY, doc.page.width - 140, 80, 5).fill('#f9f9f9');
        
        doc.fontSize(16)
           .fillColor('#000')
           .text(event.title, 90, eventInfoY + 15, { align: 'center', width: doc.page.width - 180 })
           .moveDown(0.5);
        
        doc.fontSize(12)
           .fillColor('#333')
           .text(`${new Date(event.startDate).toLocaleDateString()} at ${new Date(event.startDate).toLocaleTimeString()}`, { align: 'center' })
           .text(`${event.location.name}, ${event.location.address.city}`, { align: 'center' })
           .moveDown(2);
        
        // Add QR code with a nice frame
        const qrY = doc.y;
        const qrSize = 180;
        const qrX = doc.page.width / 2 - qrSize/2;
        
        // QR code frame
        doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 5)
           .fillAndStroke('#fff', '#4A6741');
           
        // QR code image
        doc.image(qrDataUrl, qrX, qrY, {
          width: qrSize
        })
        .moveDown(1.5);
        
        // Add attendee info if available
        if (ticket.attendeeName || ticket.attendeeEmail) {
          doc.fontSize(14)
             .fillColor('#4A6741')
             .text('ATTENDEE INFORMATION', { align: 'center' })
             .moveDown(0.5);
          
          const attendeeY = doc.y;
          doc.roundedRect(100, attendeeY, doc.page.width - 200, 60, 5).fillAndStroke('#f9f9f9', '#4A6741');
          
          doc.fontSize(12)
             .fillColor('#333')
             .text(`Name: ${ticket.attendeeName || 'Not specified'}`, 120, attendeeY + 20)
             .text(`Email: ${ticket.attendeeEmail || 'Not specified'}`, 120, attendeeY + 40)
             .moveDown(1.5);
        }
        
        // Add ticket footer with instructions
        const footerY = doc.page.height - 100;
        doc.fontSize(10)
           .fillColor('#666')
           .text('Please present this ticket (printed or on mobile device) at the entrance.', 70, footerY, { align: 'center', width: doc.page.width - 140 })
           .text('This ticket is unique and valid for one-time entry only.', { align: 'center' });
        
        // Add barcode-like design at the bottom (purely decorative)
        const barcodeY = doc.page.height - 70;
        let barX = 100;
        const barWidth = 3;
        const maxWidth = doc.page.width - 200;
        
        while (barX < maxWidth + 100) {
          const barHeight = 10 + Math.random() * 20;
          doc.rect(barX, barcodeY, barWidth, barHeight).fill('#4A6741');
          barX += barWidth + 1 + Math.floor(Math.random() * 3);
        }
      }

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateQRCode,
  generateTicketPDF
}; 