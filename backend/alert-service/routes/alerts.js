const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Alert = require('../models/Alert');
const AlertHistory = require('../models/AlertHistory');
const emailService = require('../services/emailService');

// Validation schema
const alertSchema = Joi.object({
  name: Joi.string().required(). trim().min(3).max(100),
  description: Joi.string(). allow('').trim().max(500),
  service: Joi.string().required().valid('EC2', 'S3', 'RDS', 'Lambda', 'EBS', 'Cost'),
  metric: Joi.string().required(),
  condition: Joi.object({
    operator: Joi. string().required().valid('>', '<', '>=', '<=', '==', '!='),
    threshold: Joi.number().required(),
    duration: Joi.number().min(1).max(60).default(5)
  }).required(),
  resourceFilter: Joi.object({
    monitoringScope: Joi.string().valid('all', 'specific').default('all'),
    resourceIds: Joi.array().items(Joi.string()).default([]),
    aggregation: Joi.string().valid('average', 'maximum', 'minimum', 'sum').default('average'),
    tags: Joi.array().items(Joi.object({
      key: Joi.string(),
      value: Joi.string()
    })).default([]),
    region: Joi.string().allow('').optional()
  }).optional(),
  notifications: Joi.object({
    email: Joi. object({
      enabled: Joi.boolean(). default(true),
      recipients: Joi.array().items(Joi.string(). email())
    }),
    inApp: Joi.object({
      enabled: Joi. boolean().default(true)
    }),
    webhook: Joi.object({
      enabled: Joi. boolean().default(false),
      url: Joi.string().uri().allow('').optional(),
      headers: Joi.object()
    })
  }),
  severity: Joi.string().valid('info', 'warning', 'critical').default('warning'),
  cooldownPeriod: Joi. number().min(5).max(1440).default(15),
  enabled: Joi.boolean().default(true)
});

// GET all alerts for a user
router.get('/:userId', async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.params.userId }). sort({ createdAt: -1 });
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

// GET single alert
router.get('/:userId/:alertId', async (req, res) => {
  try {
    const alert = await Alert. findOne({ 
      _id: req.params.alertId, 
      userId: req.params.userId 
    });
    
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    
    res.json({ success: true, alert });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res. status(500).json({ success: false, message: 'Failed to fetch alert' });
  }
});

// CREATE new alert
router.post('/:userId', async (req, res) => {
  try {
    console.log('📥 Received alert creation request for user:', req.params.userId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = alertSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      console.error('❌ Validation failed:', error.details.map(d => d.message));
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
          type: d.type
        }))
      });
    }

    console.log('✅ Validation passed, creating alert...');
    const alert = new Alert({
      ...value,
      userId: req.params.userId
    });

    await alert.save();
    console.log('✅ Alert created successfully:', alert._id);
    
    res.status(201).json({ 
      success: true, 
      message: 'Alert created successfully', 
      alert 
    });
  } catch (error) {
    console.error('❌ Error creating alert:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create alert',
      error: error.message 
    });
  }
});

// UPDATE alert
router.put('/:userId/:alertId', async (req, res) => {
  try {
    console.log('📥 Received alert update request for user:', req.params.userId, 'alert:', req.params.alertId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = alertSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      console.error('❌ Validation failed:', error.details.map(d => d.message));
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
          type: d.type
        }))
      });
    }

    console.log('✅ Validation passed, updating alert...');
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.params.userId },
      { ...value, updatedAt: Date.now() },
      { new: true }
    );

    if (!alert) {
      console.log('❌ Alert not found');
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    console.log('✅ Alert updated successfully:', alert._id);
    res.json({ success: true, message: 'Alert updated successfully', alert });
  } catch (error) {
    console.error('❌ Error updating alert:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update alert',
      error: error.message 
    });
  }
});

// TOGGLE alert enabled/disabled
router.patch('/:userId/:alertId/toggle', async (req, res) => {
  try {
    const alert = await Alert.findOne({ 
      _id: req.params.alertId, 
      userId: req.params.userId 
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.enabled = !alert.enabled;
    alert.updatedAt = Date.now();
    await alert.save();

    res.json({ 
      success: true, 
      message: `Alert ${alert.enabled ? 'enabled' : 'disabled'}`, 
      alert 
    });
  } catch (error) {
    console.error('Error toggling alert:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle alert' });
  }
});

// DELETE alert
router.delete('/:userId/:alertId', async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ 
      _id: req.params.alertId, 
      userId: req.params.userId 
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Also delete alert history
    await AlertHistory.deleteMany({ alertId: req.params.alertId });

    res. json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
    console. error('Error deleting alert:', error);
    res.status(500).json({ success: false, message: 'Failed to delete alert' });
  }
});

// GET alert history
router.get('/:userId/history/all', async (req, res) => {
  try {
    const { limit = 50, skip = 0, acknowledged } = req.query;
    
    const query = { userId: req.params. userId };
    if (acknowledged !== undefined) {
      query.acknowledged = acknowledged === 'true';
    }

    const history = await AlertHistory.find(query)
      .populate('alertId', 'name service metric')
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AlertHistory.countDocuments(query);

    res.json({ success: true, history, total });
  } catch (error) {
    console.error('Error fetching alert history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alert history' });
  }
});

// ACKNOWLEDGE alert
router.patch('/:userId/history/:historyId/acknowledge', async (req, res) => {
  try {
    const history = await AlertHistory.findOneAndUpdate(
      { _id: req.params.historyId, userId: req.params. userId },
      { 
        acknowledged: true, 
        acknowledgedAt: Date.now(),
        acknowledgedBy: req.params.userId
      },
      { new: true }
    );

    if (!history) {
      return res.status(404).json({ success: false, message: 'Alert history not found' });
    }

    res.json({ success: true, message: 'Alert acknowledged', history });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert' });
  }
});

// RESOLVE alert
router.patch('/:userId/history/:historyId/resolve', async (req, res) => {
  try {
    const history = await AlertHistory.findOneAndUpdate(
      { _id: req.params.historyId, userId: req.params.userId },
      { 
        resolved: true, 
        resolvedAt: Date.now()
      },
      { new: true }
    );

    if (!history) {
      return res.status(404).json({ success: false, message: 'Alert history not found' });
    }

    res.json({ success: true, message: 'Alert resolved', history });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500). json({ success: false, message: 'Failed to resolve alert' });
  }
});

// TEST email notification
router.post('/:userId/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const result = await emailService.sendTestEmail(email);
    
    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send test email', error: result.error });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
});

// GET alert statistics
router.get('/:userId/stats/summary', async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments({ userId: req.params. userId });
    const enabledAlerts = await Alert.countDocuments({ userId: req.params.userId, enabled: true });
    const totalTriggers = await AlertHistory.countDocuments({ userId: req.params. userId });
    const recentTriggers = await AlertHistory.countDocuments({ 
      userId: req.params. userId,
      triggeredAt: { $gte: new Date(Date. now() - 24 * 60 * 60 * 1000) }
    });
    const unacknowledged = await AlertHistory.countDocuments({ 
      userId: req. params.userId,
      acknowledged: false
    });

    res.json({
      success: true,
      stats: {
        totalAlerts,
        enabledAlerts,
        disabledAlerts: totalAlerts - enabledAlerts,
        totalTriggers,
        recentTriggers,
        unacknowledged
      }
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alert stats' });
  }
});

module.exports = router;