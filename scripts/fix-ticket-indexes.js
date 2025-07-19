const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Script to fix ticket indexes
 * This script will:
 * 1. Drop any existing problematic indexes on ticketNumber
 * 2. Ensure the correct indexes are in place
 */

async function fixTicketIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('tickets');

    // Get existing indexes
    const existingIndexes = await collection.indexes();
    console.log('Existing indexes:', existingIndexes.map(idx => idx.name));

    // Drop any problematic indexes
    const indexesToDrop = [];
    
    for (const index of existingIndexes) {
      // Drop any index that has ticketNumber at root level (not in ticketDetails)
      if (index.key && index.key.ticketNumber === 1) {
        indexesToDrop.push(index.name);
      }
    }

    // Drop problematic indexes
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Could not drop index ${indexName}:`, error.message);
      }
    }

    // Create the correct indexes
    const Ticket = require('../models/ticket');
    
    // This will create the indexes defined in the schema
    await Ticket.createIndexes();
    console.log('Created/updated ticket indexes');

    // Verify the indexes
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => idx.name));

    console.log('Ticket indexes fixed successfully!');
  } catch (error) {
    console.error('Error fixing ticket indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixTicketIndexes();
}

module.exports = fixTicketIndexes; 