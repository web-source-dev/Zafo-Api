const mongoose = require('mongoose');

/**
 * Saved Event Schema
 * This schema represents the relationship between a user and an event they've saved/favorited
 */
const savedEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index to ensure uniqueness for user-event pairs
// This prevents a user from saving the same event multiple times
savedEventSchema.index({ user: 1, event: 1 }, { unique: true });

const SavedEvent = mongoose.model('SavedEvent', savedEventSchema);

module.exports = SavedEvent; 