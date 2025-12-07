const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

const optimizerRoutes = require('./routes/optimizer');
const recommendationEngine = require('./services/recommendationEngine');

const app = express();
const PORT = process.env.PORT || 3009;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudops-cost-optimizer';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/optimizer', optimizerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'cost-optimizer-service' });
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB (Cost Optimizer DB)');
    
    // Start scheduled recommendation generation
    startScheduledRecommendations();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Start server
app.listen(PORT, () => {
  console.log('🚀 Starting Cost Optimizer Service.. .');
  console.log(`✅ Cost Optimizer Service running on port ${PORT}`);
});

// Schedule recommendation generation daily at 9 AM
function startScheduledRecommendations() {
  // Run daily at 9:00 AM
  cron. schedule('0 9 * * *', async () => {
    console.log('🔄 Running scheduled cost optimization analysis...');
    
    try {
      // In production, fetch all user IDs from database
      // For now, using a placeholder
      const userId = process.env.DEFAULT_USER_ID || '6933a85c2c75b5a8192c2de4';
      
      const result = await recommendationEngine.generateRecommendations(userId);
      
      if (result.success) {
        console.log(`✅ Generated ${result.count} recommendations for user ${userId}`);
      } else {
        console.error(`❌ Failed to generate recommendations: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error in scheduled recommendations:', error. message);
    }
  });
  
  console.log('⏰ Scheduled daily cost optimization at 9:00 AM');
}