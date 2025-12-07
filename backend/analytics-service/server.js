const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

const analyticsRoutes = require('./routes/analytics');
const dataAggregator = require('./services/dataAggregator');

const app = express();
const PORT = process.env.PORT || 3008;
const MONGODB_URI = process. env.MONGODB_URI || 'mongodb://localhost:27017/cloudops-analytics';

// Middleware
app.use(cors());
app. use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics-service' });
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB (Analytics DB)');
    
    // Start scheduled metric collection after DB connection
    startScheduledCollection();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Start server
app.listen(PORT, () => {
  console.log('🚀 Starting Analytics Service.. .');
  console.log(`✅ Analytics Service running on port ${PORT}`);
});

// Schedule data collection every 5 minutes
function startScheduledCollection() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Running scheduled metric collection at', new Date(). toISOString());
    
    try {
      // In a real app, you'd fetch all user IDs from a User collection
      // For now, we'll use the API Gateway to get active users
      // Or you can hardcode user IDs for testing
      
      // Example: Collect for a specific user (replace with actual user ID)
      const userId = '6933a85c2c75b5a8192c2de4'; // Your user ID
      const result = await dataAggregator. collectAndStoreMetrics(userId);
      
      if (result.success) {
        console.log(`✅ Scheduled collection completed: ${result.count} metrics stored`);
      } else {
        console.error(`❌ Scheduled collection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error in scheduled collection:', error. message);
    }
  });
  
  console.log('⏰ Scheduled metric collection every 5 minutes');
}