const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  service: {
    type: String,
    required: true,
    enum: ['EC2', 'S3', 'RDS', 'Lambda', 'EBS', 'Cost']
  },
  metric: {
    type: String,
    required: true,
    // Examples: 'cpuUtilization', 'memoryUsage', 'bucketSize', 'monthlyCost', 'errorRate'
  },
  condition: {
    operator: {
      type: String,
      required: true,
      enum: ['>', '<', '>=', '<=', '==', '!=']
    },
    threshold: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      default: 5, // minutes - alert only if condition persists
    }
  },
  resourceFilter: {
    // Optional: specific resource IDs to monitor
    monitoringScope: {
      type: String,
      enum: ['all', 'specific'],
      default: 'all'
    },
    resourceIds: {
      type: [String],
      default: []
    },
    aggregation: {
      type: String,
      enum: ['average', 'maximum', 'minimum', 'sum'],
      default: 'average'
    },
    tags: [{
      key: String,
      value: String
    }],
    region: String
  },
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      recipients: [String] // email addresses
    },
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    webhook: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String,
      headers: Object
    }
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  cooldownPeriod: {
    type: Number,
    default: 15, // minutes - prevent alert spam
  },
  lastTriggered: Date,
  triggerCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
alertSchema.index({ userId: 1, enabled: 1 });
alertSchema.index({ service: 1, metric: 1 });

module.exports = mongoose.model('Alert', alertSchema);