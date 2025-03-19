const mongoose = require('mongoose')

const flagHistorySchema = new mongoose.Schema({
  profileId: {
    type: String,
    required: true,
    index: true
  },
  profileName: {
    type: String,
    required: true
  },
  flagId: {
    type: String,
    required: true,
    index: true
  },
  flagTitle: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  previousStatus: {
    type: String,
    required: true,
    enum: ['white', 'yellow', 'red']
  },
  newStatus: {
    type: String,
    required: true,
    enum: ['white', 'yellow', 'red']
  },
  reason: {
    type: String,
    default: ''
  },
  attachments: {
    type: Array,
    default: []
  }
})

// Create compound index for efficient queries
flagHistorySchema.index({ profileId: 1, flagId: 1 })

const FlagHistory = mongoose.model('FlagHistory', flagHistorySchema)

module.exports = FlagHistory
