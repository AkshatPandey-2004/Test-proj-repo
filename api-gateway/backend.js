import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Microservice URLs
const USER_SERVICE_URL = 'http://localhost:3001';
const MONITORING_SERVICE_URL = 'http://localhost:3002';

app.use(cors());
app.use(express.json());

// --- REGISTRATION ROUTE ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const response = await axios.post(`${USER_SERVICE_URL}/api/user/register`, req.body);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to connect to User Service';
        res.status(status).send({ message });
    }
});

// --- LOGIN ROUTE ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.post(`${USER_SERVICE_URL}/api/user/login`, req.body);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to connect to User Service';
        res.status(status).send({ message });
    }
});

// --- OLD CREDENTIALS ROUTE (for backward compatibility) ---
app.post('/api/auth/credentials', async (req, res) => {
    try {
        const response = await axios.post(`${USER_SERVICE_URL}/api/user/credentials`, req.body);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to connect to User Service (3001)';
        res.status(status).send({ message });
    }
});

// --- METRICS ROUTE ---
app.get('/api/data/metrics/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { region } = req.query; // Get region from query params
        
        console.log(`Gateway: Fetching metrics for user ${userId}, region: ${region || 'default'}`);
        
        // Forward region as query parameter to monitoring service
        let url = `${MONITORING_SERVICE_URL}/api/metrics/${userId}`;
        if (region) {
            url += `?region=${region}`;
        }
        
        const response = await axios.get(url);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response 
            ? error.response.data.message 
            : 'Gateway Error: Failed to connect to Monitoring Service (3002)';
        console.error('Gateway error:', message);
        res.status(status).send({ message });
    }
});
app.get('/api/user/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Gateway: Fetching profile for user', userId);
        const response = await axios.get(`${USER_SERVICE_URL}/api/user/profile/${userId}`);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to fetch profile';
        console.error('Gateway error:', message);
        res.status(status).send({ message });
    }
});

// Update user profile
app.post('/api/user/update-profile', async (req, res) => {
    try {
        console.log('Gateway: Updating profile');
        const response = await axios.post(`${USER_SERVICE_URL}/api/user/update-profile`, req.body);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to update profile';
        console.error('Gateway error:', message);
        res.status(status).send({ message });
    }
});

// Update region
app.post('/api/auth/update-region', async (req, res) => {
    try {
        console.log('Gateway: Updating region');
        const response = await axios.post(`${USER_SERVICE_URL}/api/user/update-region`, req.body);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to update region';
        console.error('Gateway error:', message);
        res.status(status).send({ message });
    }
});
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Microservices running on:`);
    console.log(` - User Service: ${USER_SERVICE_URL}`);
    console.log(` - Monitoring Service: ${MONITORING_SERVICE_URL}`);
});