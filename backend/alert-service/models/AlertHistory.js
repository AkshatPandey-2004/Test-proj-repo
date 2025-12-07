const mongoose = require('mongoose');

const alertHistorySchema = new mongoose.Schema({
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  triggeredAt: {
    type: Date,
    default: Date. now
  },
  metric: String,
  currentValue: Number,
  threshold: Number,
  service: String,
  resourceId: String,
  severity: String,
  message: String,
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: Date,
  acknowledgedBy: String,
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  notificationsSent: {
    email: Boolean,
    inApp: Boolean,
    webhook: Boolean
  }
});

// Auto-expire old history after 90 days
alertHistorySchema. index({ triggeredAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AlertHistory', alertHistorySchema);