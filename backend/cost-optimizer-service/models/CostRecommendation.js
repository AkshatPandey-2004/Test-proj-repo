const mongoose = require('mongoose');

const costRecommendationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['EC2_IDLE', 'EC2_STOPPED', 'S3_LIFECYCLE', 'RDS_RIGHTSIZING', 'EBS_UNUSED', 'RESERVED_INSTANCES', 'UNUSED_EIP', 'OLD_SNAPSHOTS', 'UNDERUTILIZED_RESOURCES']
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  estimatedMonthlySavings: {
    type: Number,
    required: true
  },
  estimatedYearlySavings: {
    type: Number
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  implementationTime: {
    type: String,
    default: '5 minutes'
  },
  resourceDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  implemented: {
    type: Boolean,
    default: false
  },
  implementedAt: {
    type: Date
  },
  actualSavings: {
    type: Number,
    default: 0
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'not_required'],
    default: 'pending'
  },
  verificationReason: {
    type: String
  },
  verifiedAt: {
    type: Date
  },
  impact: {
    type: String,
    enum: ['No Impact', 'Low Impact', 'Medium Impact', 'High Impact'],
    default: 'Low Impact'
  },
  category: {
    type: String,
    enum: ['Compute', 'Storage', 'Database', 'Network', 'General'],
    required: true
  },
  autoImplementable: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
costRecommendationSchema.index({ userId: 1, implemented: 1, createdAt: -1 });

module.exports = mongoose.model('CostRecommendation', costRecommendationSchema);