/**
 * Seed script to populate subscription plans in the database
 * 
 * Usage:
 * node seed-plans.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('../models/plan');

// Load environment variables
dotenv.config();

// Plans data
const plans = [
  {
    name: 'Starter',
    description: 'Perfect for new organizers just getting started',
    features: [
      'Organize up to 20 events per month (250 per year)',
      'Basic event details',
      'Basic pricing options',
      'Basic email notifications',
      'Standard support',
      'Basic attendee management',
      'Access to templates',
    ],
    priceMonthly: 10.00,
    priceYearly: 100.00,
    stripePriceIdMonthly: 'price_1RRn0YClbv0F75viYddE7AZ4',
    stripePriceIdYearly: 'price_1RRn0YClbv0F75viPUitgZjZ',
    stripeProductId: 'prod_SMW2vjv9gWClKU',
    isActive: true,
    limits: {
      monthlyEvents: 20,
      yearlyEvents: 250,
      allowPricing: true,
      allowDetailedDescription: true
    }
  },
  {
    name: 'Growth',
    description: 'Ideal for growing organizers with regular events',
    features: [
      'Organize up to 50 events per month (500 per year)',
      'Advanced event customization',
      'Full pricing options',
      'Custom email templates',
      'Priority support',
      'Advanced attendee management',
      'Custom branding',
      'Event analytics'
    ],
    priceMonthly: 25.00,
    priceYearly: 225.00,
    stripePriceIdMonthly: 'price_1RRn2bClbv0F75viYolgqPCD',
    stripePriceIdYearly: 'price_1RRn2bClbv0F75viL6orTzEI',
    stripeProductId: 'prod_SMW4hcj7eZI7y6',
    isActive: true,
    limits: {
      monthlyEvents: 50,
      yearlyEvents: 500,
      allowPricing: true,
      allowDetailedDescription: true,
      allowAdvancedFeatures: true
    }
  },
  {
    name: 'Pro',
    description: 'For serious organizers who need all the tools',
    features: [
      'Organize up to 150 events per month (1500 per year)',
      'Comprehensive event customization',
      'Premium pricing options',
      'Advanced customization',
      'Premium support with dedicated agent',
      'VIP attendee management',
      'White-label experience',
      'Comprehensive analytics',
      'API access'
    ],
    priceMonthly: 49.00,
    priceYearly: 400.00,
    stripePriceIdMonthly: 'price_1RRn47Clbv0F75vizlfHQpO9',
    stripePriceIdYearly: 'price_1RRn47Clbv0F75viZEBTY0NO',
    stripeProductId: 'prod_SMW65tGFpprcD9',
    isActive: true,
    limits: {
      monthlyEvents: 150,
      yearlyEvents: 1500,
      allowPricing: true,
      allowDetailedDescription: true,
      allowAdvancedFeatures: true,
      allowPremiumFeatures: true
    }
  }
];

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zafo-app';

async function seedPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('Cleared existing plans');

    // Insert new plans
    await Plan.insertMany(plans);
    console.log('Inserted new plans');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
}

// Run the seed function
seedPlans(); 