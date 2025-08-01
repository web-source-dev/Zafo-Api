const cron = require('node-cron');
const transferToOrganizers = require('../scripts/transfer-to-organizers');
const emailService = require('../utils/email');
const { adminNotifications: adminNotificationsTemplate } = require('../utils/email-templates');
const User = require('../models/user');

/**
 * Scheduler Service
 * Handles automated tasks like transferring payments to organizers
 */
class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting scheduler service...');
    this.isRunning = true;

    // Schedule daily transfer to organizers at 2 AM
    this.scheduleOrganizerTransfers();

    // Schedule other automated tasks here
    // this.scheduleEventReminders();
    // this.schedulePaymentReminders();

    console.log('Scheduler service started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping scheduler service...');
    
    // Stop all cron jobs
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Scheduler service stopped');
  }

  /**
   * Schedule daily transfer to organizers
   */
  scheduleOrganizerTransfers() {
    // Run daily at 2:00 AM
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled organizer transfer...');
      try {
        // Automated transfer - only completed events
        const results = await transferToOrganizers(false);
        console.log('Scheduled transfer completed:', results);
        
        // Send automated transfer notifications
        if (results.organizersWithTransfers) {
          await this.sendAutomatedTransferNotifications(results.organizersWithTransfers);
        }
      } catch (error) {
        console.error('Scheduled transfer failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Zurich' // Swiss timezone
    });

    this.jobs.set('organizerTransfers', job);
    console.log('Scheduled organizer transfers (daily at 2:00 AM)');
  }

  /**
   * Run transfer immediately (for testing or manual execution)
   * @param {boolean} isManualTransfer - If true, transfer for published/completed events. If false, only completed events.
   */
  async runTransferNow(isManualTransfer = false) {
    console.log(`Running transfer immediately (${isManualTransfer ? 'manual' : 'automated'})...`);
    try {
      const results = await transferToOrganizers(isManualTransfer);
      console.log('Immediate transfer completed:', results);
      
      // Send automated transfer notifications if not manual
      if (!isManualTransfer && results.organizersWithTransfers) {
        await this.sendAutomatedTransferNotifications(results.organizersWithTransfers);
      }
      
      return results;
    } catch (error) {
      console.error('Immediate transfer failed:', error);
      throw error;
    }
  }

  /**
   * Send automated transfer notifications to organizers
   * @param {Array} organizersWithTransfers - Array of organizers with transfer results
   */
  async sendAutomatedTransferNotifications(organizersWithTransfers) {
    for (const organizerData of organizersWithTransfers) {
      try {
        const organizer = await User.findById(organizerData.organizerId);
        if (!organizer) continue;

        const transferEmailHtml = adminNotificationsTemplate.generateAutomatedTransferEmail({
          organizerName: `${organizer.firstName} ${organizer.lastName}`,
          amount: organizerData.totalAmount,
          currency: 'CHF',
          successCount: organizerData.successCount,
          failureCount: organizerData.failureCount
        });
        const transferEmailText = adminNotificationsTemplate.generateAutomatedTransferText({
          organizerName: `${organizer.firstName} ${organizer.lastName}`,
          amount: organizerData.totalAmount,
          currency: 'CHF',
          successCount: organizerData.successCount,
          failureCount: organizerData.failureCount
        });

        await emailService.sendEmail({
          to: organizer.email,
          subject: 'Automated Payment Transfer - Zafo',
          html: transferEmailHtml,
          text: transferEmailText
        });

        console.log(`Automated transfer notification sent to ${organizer.email}`);
      } catch (emailError) {
        console.error(`Failed to send automated transfer notification to organizer ${organizerData.organizerId}:`, emailError);
      }
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      nextTransfer: this.getNextTransferTime()
    };
  }

  /**
   * Get next transfer time
   */
  getNextTransferTime() {
    const now = new Date();
    const next = new Date();
    next.setHours(2, 0, 0, 0); // 2:00 AM
    
    if (next <= now) {
      next.setDate(next.getDate() + 1); // Tomorrow
    }
    
    return next;
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService; 