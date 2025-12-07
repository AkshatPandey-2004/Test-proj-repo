const axios = require('axios');
const SavingsTracker = require('../models/SavingsTracker');
const recommendationEngine = require('./recommendationEngine');

const MONITORING_SERVICE_URL = process.env. MONITORING_SERVICE_URL || 'http://monitoring-service:3002';

class ImplementationService {
  
  async stopEC2Instance(userId, instanceId, recommendationId) {
    try {
      console.log(`🛑 Stopping EC2 instance ${instanceId} for user ${userId}...`);
      
      // Call AWS SDK through monitoring service
      const response = await axios.post(`${MONITORING_SERVICE_URL}/api/ec2/stop`, {
        userId,
        instanceId
      });
      
      if (response.data.success) {
        // Mark recommendation as implemented
        const recommendation = await recommendationEngine.markAsImplemented(recommendationId);
        
        // Track savings
        await SavingsTracker.create({
          userId,
          recommendationId,
          estimatedSavings: recommendation.estimatedMonthlySavings,
          verified: false
        });
        
        console.log(`✅ Instance ${instanceId} stopped successfully`);
        return { success: true, message: 'Instance stopped successfully' };
      }
      
      return { success: false, error: 'Failed to stop instance' };
      
    } catch (error) {
      console.error(`❌ Error stopping EC2 instance:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  async terminateEC2Instance(userId, instanceId, recommendationId) {
    try {
      console.log(`🗑️ Terminating EC2 instance ${instanceId} for user ${userId}...`);
      
      const response = await axios.post(`${MONITORING_SERVICE_URL}/api/ec2/terminate`, {
        userId,
        instanceId
      });
      
      if (response.data.success) {
        const recommendation = await recommendationEngine.markAsImplemented(recommendationId);
        
        await SavingsTracker.create({
          userId,
          recommendationId,
          estimatedSavings: recommendation.estimatedMonthlySavings,
          verified: false
        });
        
        console.log(`✅ Instance ${instanceId} terminated successfully`);
        return { success: true, message: 'Instance terminated successfully' };
      }
      
      return { success: false, error: 'Failed to terminate instance' };
      
    } catch (error) {
      console.error(`❌ Error terminating EC2 instance:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  async deleteEBSVolume(userId, volumeId, recommendationId) {
    try {
      console.log(`🗑️ Deleting EBS volume ${volumeId} for user ${userId}...`);
      
      const response = await axios.post(`${MONITORING_SERVICE_URL}/api/ebs/delete`, {
        userId,
        volumeId
      });
      
      if (response.data.success) {
        const recommendation = await recommendationEngine.markAsImplemented(recommendationId);
        
        await SavingsTracker. create({
          userId,
          recommendationId,
          estimatedSavings: recommendation.estimatedMonthlySavings,
          verified: false
        });
        
        console.log(`✅ Volume ${volumeId} deleted successfully`);
        return { success: true, message: 'Volume deleted successfully' };
      }
      
      return { success: false, error: 'Failed to delete volume' };
      
    } catch (error) {
      console.error(`❌ Error deleting EBS volume:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ImplementationService();