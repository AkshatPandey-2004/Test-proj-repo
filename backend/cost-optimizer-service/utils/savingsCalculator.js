const SavingsTracker = require('../models/SavingsTracker');

class SavingsCalculator {
  
  async getTotalSavings(userId, timeframe = 'all') {
    try {
      const query = { userId, verified: true };
      
      // Add date filter based on timeframe
      if (timeframe === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        query.implementedAt = { $gte: startOfMonth };
      } else if (timeframe === 'week') {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        query.implementedAt = { $gte: startOfWeek };
      }
      
      const savings = await SavingsTracker. find(query);
      
      const totalActual = savings.reduce((sum, s) => sum + s.actualSavings, 0);
      const totalEstimated = savings.reduce((sum, s) => sum + s. estimatedSavings, 0);
      
      return {
        totalActualSavings: totalActual,
        totalEstimatedSavings: totalEstimated,
        savingsCount: savings.length,
        accuracy: totalEstimated > 0 ? ((totalActual / totalEstimated) * 100).toFixed(2) : 0
      };
      
    } catch (error) {
      console.error('Error calculating total savings:', error);
      throw error;
    }
  }
  
  async getSavingsTimeline(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate. getDate() - days);
      
      const savings = await SavingsTracker. find({
        userId,
        implementedAt: { $gte: startDate }
      }). sort({ implementedAt: 1 });
      
      // Group by date
      const timeline = {};
      
      savings.forEach(saving => {
        const date = saving.implementedAt.toISOString().split('T')[0];
        if (!timeline[date]) {
          timeline[date] = {
            date,
            estimatedSavings: 0,
            actualSavings: 0,
            count: 0
          };
        }
        timeline[date].estimatedSavings += saving.estimatedSavings;
        timeline[date].actualSavings += saving.actualSavings;
        timeline[date].count += 1;
      });
      
      return Object.values(timeline);
      
    } catch (error) {
      console.error('Error getting savings timeline:', error);
      throw error;
    }
  }
}

module.exports = new SavingsCalculator();