const express = require('express');
const router = express.Router();
const MetricHistory = require('../models/MetricHistory');

// Get historical data for metrics
router.get('/:userId/metrics/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { service, metric, timeRange, startDate, endDate } = req.query;

    let query = { userId };
    
    if (service) query.service = service;
    if (metric) query.metricName = metric;

    // Calculate time range
    const now = new Date();
    let start = new Date();
    
    switch(timeRange) {
      case '1h': 
        start = new Date(now - 60 * 60 * 1000); 
        break;
      case '24h': 
        start = new Date(now - 24 * 60 * 60 * 1000); 
        break;
      case '7d': 
        start = new Date(now - 7 * 24 * 60 * 60 * 1000); 
        break;
      case '30d': 
        start = new Date(now - 30 * 24 * 60 * 60 * 1000); 
        break;
      case '90d': 
        start = new Date(now - 90 * 24 * 60 * 60 * 1000); 
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          query.timestamp = { $gte: start, $lte: new Date(endDate) };
        }
        break;
      default: 
        start = new Date(now - 24 * 60 * 60 * 1000);
    }

    if (timeRange !== 'custom') {
      query.timestamp = { $gte: start };
    }

    const data = await MetricHistory.find(query)
      .sort({ timestamp: 1 })
      .limit(1000)
      .lean();

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch historical data', error: error.message });
  }
});

// Get trend analysis with comparisons
router.get('/:userId/metrics/trends', async (req, res) => {
  try {
    const { userId } = req.params;
    const { service, metric } = req.query;

    if (!service || !metric) {
      return res.status(400). json({ success: false, message: 'Service and metric are required' });
    }

    // Calculate averages for different time periods
    const thisWeek = await getMetricAverage(userId, service, metric, 7);
    const lastWeek = await getMetricAverage(userId, service, metric, 14, 7);
    const thisMonth = await getMetricAverage(userId, service, metric, 30);
    const lastMonth = await getMetricAverage(userId, service, metric, 60, 30);

    const weekChange = calculatePercentChange(lastWeek, thisWeek);
    const monthChange = calculatePercentChange(lastMonth, thisMonth);

    res.json({
      success: true,
      trends: {
        current: thisWeek,
        comparisons: {
          week: { 
            previous: lastWeek, 
            current: thisWeek, 
            change: weekChange,
            direction: weekChange > 0 ?  'up' : 'down'
          },
          month: { 
            previous: lastMonth, 
            current: thisMonth, 
            change: monthChange,
            direction: monthChange > 0 ? 'up' : 'down'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error calculating trends:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate trends', error: error.message });
  }
});

// Helper function to calculate metric average for a time period
async function getMetricAverage(userId, service, metric, days, offset = 0) {
  const end = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
  const start = new Date(end - days * 24 * 60 * 60 * 1000);

  const result = await MetricHistory.aggregate([
    {
      $match: {
        userId,
        service,
        metricName: metric,
        timestamp: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$value' }
      }
    }
  ]);

  return result[0]?.average || 0;
}

// Helper function to calculate percentage change
function calculatePercentChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return parseFloat(((newValue - oldValue) / oldValue * 100).toFixed(2));
}

// Trigger manual data collection
router.post('/:userId/collect', async (req, res) => {
  try {
    const dataAggregator = require('../services/dataAggregator');
    const result = await dataAggregator. collectAndStoreMetrics(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to collect metrics' });
  }
});

module.exports = router;