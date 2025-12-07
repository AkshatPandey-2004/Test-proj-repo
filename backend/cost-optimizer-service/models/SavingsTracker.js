const mongoose = require('mongoose');

const savingsTrackerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  recommendationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostRecommendation',
    required: true
  },
  implementedAt: {
    type: Date,
    default: Date.now
  },
  estimatedSavings: {
    type: Number,
    required: true
  },
  actualSavings: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

savingsTrackerSchema.index({ userId: 1, implementedAt: -1 });

module.exports = mongoose.model('SavingsTracker', savingsTrackerSchema);