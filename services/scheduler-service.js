const cron = require('node-cron');
const transferToOrganizers = require('../scripts/transfer-to-organizers');

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
    const job = cron.schedule('26 * * * *', async () => {
      console.log('Running scheduled organizer transfer...');
      try {
        const results = await transferToOrganizers();
        console.log('Scheduled transfer completed:', results);
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
   */
  async runTransferNow() {
    console.log('Running transfer immediately...');
    try {
      const results = await transferToOrganizers();
      console.log('Immediate transfer completed:', results);
      return results;
    } catch (error) {
      console.error('Immediate transfer failed:', error);
      throw error;
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