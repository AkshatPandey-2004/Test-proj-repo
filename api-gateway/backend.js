import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Use environment variable or default
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const MONITORING_SERVICE_URL = process.env.MONITORING_SERVICE_URL || 'http://monitoring-service:3002';
const ALERT_SERVICE_URL = process.env.ALERT_SERVICE_URL || 'http://alert-service:3007';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3008';

console.log('🌐 API Gateway starting...');
console.log('📍 User Service URL:', USER_SERVICE_URL);
console.log('📍 Monitoring Service URL:', MONITORING_SERVICE_URL);
console.log('📍 Alert Service URL:', ALERT_SERVICE_URL);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    connections: {
      userService: USER_SERVICE_URL,
      monitoringService: MONITORING_SERVICE_URL,
      alertService: ALERT_SERVICE_URL
    }
  });
});

// Test connection to user-service
app.get('/test-connection', async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({
      status: 'success',
      userService: response.data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      url: `${USER_SERVICE_URL}/health`
    });
  }
});

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Register request received');
    const response = await axios.post(`${USER_SERVICE_URL}/api/auth/register`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Register error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to User Service';
    res.status(status).send({ message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login request received for:', req.body.username || req.body.email);
    const response = await axios.post(`${USER_SERVICE_URL}/api/auth/login`, req.body, {
      timeout: 10000
    });
    console.log('✅ Login successful');
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Login error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to User Service at:', USER_SERVICE_URL);
    }
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : `Gateway Error: Failed to connect to User Service (${error.message})`;
    res.status(status).send({ message });
  }
});

// Update Region
app.post('/api/auth/update-region', async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/api/auth/update-region`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Update region error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to User Service';
    res.status(status).send({ message });
  }
});

// --- PROFILE ROUTES ---

// Get Profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${USER_SERVICE_URL}/api/profile/${userId}`, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get profile error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to User Service';
    res.status(status).send({ message });
  }
});

// Update Profile
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.put(`${USER_SERVICE_URL}/api/profile/${userId}`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Update profile error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to User Service';
    res.status(status).send({ message });
  }
});

// --- DATA ROUTES ---

// Get Metrics
app.get('/api/data/metrics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { region, services } = req.query;
    
    const url = `${MONITORING_SERVICE_URL}/api/metrics/${userId}${region ? `?region=${region}` : ''}${services ? `&services=${services}` : ''}`;
    
    const response = await axios.get(url, { timeout: 30000 });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get metrics error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to Monitoring Service';
    res.status(status).send({ message });
  }
});

// Get Costs
app.get('/api/data/costs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${MONITORING_SERVICE_URL}/api/costs/${userId}`, {
      timeout: 30000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get costs error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to Monitoring Service';
    res.status(status).send({ message });
  }
});

// Get Resources for Alert Creation
app.get('/api/data/resources/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { service, region } = req.query;
    
    const url = `${MONITORING_SERVICE_URL}/api/resources/${userId}?service=${service || ''}&region=${region || ''}`;
    
    const response = await axios.get(url, { timeout: 30000 });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get resources error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data.message 
      : 'Gateway Error: Failed to connect to Monitoring Service';
    res.status(status).send({ message });
  }
});

// --- ALERT ROUTES ---
// Proxy all alert requests to alert service

// Get all alerts for user
app.get('/api/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📬 Get alerts for user: ${userId}`);
    const response = await axios.get(`${ALERT_SERVICE_URL}/api/alerts/${userId}`, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get alerts error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to fetch alerts' };
    res.status(status).send(message);
  }
});

// Get single alert
app.get('/api/alerts/:userId/:alertId', async (req, res) => {
  try {
    const { userId, alertId } = req.params;
    const response = await axios.get(`${ALERT_SERVICE_URL}/api/alerts/${userId}/${alertId}`, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get alert error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to fetch alert' };
    res.status(status).send(message);
  }
});

// Create alert
app.post('/api/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📬 Create alert request for user:', userId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    const response = await axios.post(`${ALERT_SERVICE_URL}/api/alerts/${userId}`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Create alert error:', error.message);
    if (error.response) {
      console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
      console.error('📊 Status code:', error.response.status);
    }
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to create alert' };
    res.status(status).send(message);
  }
});

// Update alert
app.put('/api/alerts/:userId/:alertId', async (req, res) => {
  try {
    const { userId, alertId } = req.params;
    console.log('📝 Update alert request for user:', userId, 'alert:', alertId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    const response = await axios.put(`${ALERT_SERVICE_URL}/api/alerts/${userId}/${alertId}`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Update alert error:', error.message);
    if (error.response) {
      console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
      console.error('📊 Status code:', error.response.status);
    }
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to update alert' };
    res.status(status).send(message);
  }
});

// Toggle alert
app.patch('/api/alerts/:userId/:alertId/toggle', async (req, res) => {
  try {
    const { userId, alertId } = req.params;
    const response = await axios.patch(`${ALERT_SERVICE_URL}/api/alerts/${userId}/${alertId}/toggle`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Toggle alert error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to toggle alert' };
    res.status(status).send(message);
  }
});

// Delete alert
app.delete('/api/alerts/:userId/:alertId', async (req, res) => {
  try {
    const { userId, alertId } = req.params;
    const response = await axios.delete(`${ALERT_SERVICE_URL}/api/alerts/${userId}/${alertId}`, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Delete alert error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to delete alert' };
    res.status(status).send(message);
  }
});

// Get alert history
app.get('/api/alerts/:userId/history/all', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${ALERT_SERVICE_URL}/api/alerts/${userId}/history/all`, {
      params: req.query,
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get alert history error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to fetch alert history' };
    res.status(status).send(message);
  }
});

// Get alert stats
app.get('/api/alerts/:userId/stats/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${ALERT_SERVICE_URL}/api/alerts/${userId}/stats/summary`, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Get alert stats error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to fetch alert stats' };
    res.status(status).send(message);
  }
});

// Acknowledge alert history
app.patch('/api/alerts/:userId/history/:historyId/acknowledge', async (req, res) => {
  try {
    const { userId, historyId } = req.params;
    const response = await axios.patch(`${ALERT_SERVICE_URL}/api/alerts/${userId}/history/${historyId}/acknowledge`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Acknowledge alert error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to acknowledge alert' };
    res.status(status).send(message);
  }
});

// Test email
app.post('/api/alerts/:userId/test-email', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.post(`${ALERT_SERVICE_URL}/api/alerts/${userId}/test-email`, req.body, {
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Test email error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response 
      ? error.response.data 
      : { success: false, message: 'Failed to send test email' };
    res.status(status).send(message);
  }
});

// Analytics - Historical Data
app.get('/api/analytics/:userId/metrics/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${ANALYTICS_SERVICE_URL}/api/analytics/${userId}/metrics/history`, {
      params: req.query,
      timeout: 10000
    });
    res. status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Analytics history error:', error. message);
    const status = error.response ?  error.response.status : 500;
    const message = error.response ? error. response.data : { success: false, message: 'Failed to fetch analytics' };
    res.status(status).send(message);
  }
});

// Analytics - Trends
app.get('/api/analytics/:userId/metrics/trends', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${ANALYTICS_SERVICE_URL}/api/analytics/${userId}/metrics/trends`, {
      params: req.query,
      timeout: 10000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Analytics trends error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response ? error.response.data : { success: false, message: 'Failed to fetch trends' };
    res.status(status).send(message);
  }
});

// Analytics - Manual Data Collection
app.post('/api/analytics/:userId/collect', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.post(`${ANALYTICS_SERVICE_URL}/api/analytics/${userId}/collect`);
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Analytics collection error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response ? error.response.data : { success: false, message: 'Failed to collect data' };
    res.status(status).send(message);
  }
});

// Debug Cost Route
app.get('/api/data/costs/debug/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${MONITORING_SERVICE_URL}/api/costs/debug/${userId}`, {
      timeout: 30000
    });
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Debug costs error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response ? error.response.data : { message: 'Debug failed' };
    res.status(status).send(message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying requests to:`);
  console.log(`   - User Service: ${USER_SERVICE_URL}`);
  console.log(`   - Monitoring Service: ${MONITORING_SERVICE_URL}`);
  console.log(`   - Alert Service: ${ALERT_SERVICE_URL}`);
  console.log('📍 Analytics Service URL:', ANALYTICS_SERVICE_URL);
});