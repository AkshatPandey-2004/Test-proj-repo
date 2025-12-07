const mongoose = require('mongoose');

const metricHistorySchema = new mongoose. Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  service: {
    type: String,
    required: true,
    enum: ['EC2', 'S3', 'RDS', 'Lambda', 'EBS'],
    index: true
  },
  metricName: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
metricHistorySchema.index({ userId: 1, service: 1, metricName: 1, timestamp: -1 });

// THIS LINE IS CRITICAL - Export the MODEL, not the schema
module.exports = mongoose.model('MetricHistory', metricHistorySchema);