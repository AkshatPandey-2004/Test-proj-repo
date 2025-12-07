const express = require('express');
const router = express.Router();
const recommendationEngine = require('../services/recommendationEngine');
const implementationService = require('../services/implementationService');
const savingsCalculator = require('../utils/savingsCalculator');
const CostRecommendation = require('../models/CostRecommendation');

// Generate recommendations for a user
router.post('/:userId/generate', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await recommendationEngine.generateRecommendations(userId);
    res.json(result);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all recommendations for a user
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    const { implemented, priority, category } = req.query;
    
    const filters = {};
    if (implemented !== undefined) filters.implemented = implemented === 'true';
    if (priority) filters.priority = priority;
    if (category) filters.category = category;
    
    const recommendations = await recommendationEngine.getRecommendations(userId, filters);
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get total savings potential
router.get('/:userId/savings-potential', async (req, res) => {
  try {
    const { userId } = req. params;
    const potential = await recommendationEngine.getTotalSavingsPotential(userId);
    res.json({ success: true, ... potential });
  } catch (error) {
    console.error('Error calculating savings potential:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get actual savings achieved
router.get('/:userId/savings-achieved', async (req, res) => {
  try {
    const { userId } = req. params;
    const { timeframe } = req.query;
    const savings = await savingsCalculator.getTotalSavings(userId, timeframe || 'all');
    res. json({ success: true, ...savings });
  } catch (error) {
    console.error('Error fetching savings achieved:', error);
    res.status(500).json({ success: false, error: error. message });
  }
});

// Get savings timeline
router.get('/:userId/savings-timeline', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days } = req.query;
    const timeline = await savingsCalculator.getSavingsTimeline(userId, parseInt(days) || 30);
    res.json({ success: true, timeline });
  } catch (error) {
    console.error('Error fetching savings timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify recommendation implementation
router.post('/recommendations/:recommendationId/verify', async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { userId } = req.body;
    
    const result = await recommendationEngine.verifyImplementation(recommendationId, userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error verifying recommendation:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark recommendation as implemented
router.post('/recommendations/:recommendationId/implement', async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { actualSavings } = req.body;
    
    const recommendation = await recommendationEngine.markAsImplemented(recommendationId, actualSavings);
    res.json({ success: true, recommendation });
  } catch (error) {
    console.error('Error marking recommendation as implemented:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-implement: Stop EC2 instance
router.post('/:userId/implement/stop-ec2', async (req, res) => {
  try {
    const { userId } = req. params;
    const { instanceId, recommendationId } = req.body;
    
    const result = await implementationService.stopEC2Instance(userId, instanceId, recommendationId);
    res. json(result);
  } catch (error) {
    console.error('Error stopping EC2 instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-implement: Terminate EC2 instance
router.post('/:userId/implement/terminate-ec2', async (req, res) => {
  try {
    const { userId } = req. params;
    const { instanceId, recommendationId } = req. body;
    
    const result = await implementationService.terminateEC2Instance(userId, instanceId, recommendationId);
    res.json(result);
  } catch (error) {
    console.error('Error terminating EC2 instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-implement: Delete EBS volume
router.post('/:userId/implement/delete-ebs', async (req, res) => {
  try {
    const { userId } = req.params;
    const { volumeId, recommendationId } = req.body;
    
    const result = await implementationService.deleteEBSVolume(userId, volumeId, recommendationId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting EBS volume:', error);
    res. status(500).json({ success: false, error: error.message });
  }
});

// Get summary statistics
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [potential, achieved, activeRecommendations, implementedRecommendations] = await Promise.all([
      recommendationEngine.getTotalSavingsPotential(userId),
      savingsCalculator.getTotalSavings(userId, 'all'),
      CostRecommendation.countDocuments({ userId, implemented: false }),
      CostRecommendation.countDocuments({ userId, implemented: true })
    ]);
    
    res.json({
      success: true,
      summary: {
        potentialMonthlySavings: potential. totalMonthlySavings,
        potentialYearlySavings: potential.totalYearlySavings,
        actualSavingsAchieved: achieved.totalActualSavings,
        activeRecommendations,
        implementedRecommendations,
        totalRecommendations: activeRecommendations + implementedRecommendations
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;