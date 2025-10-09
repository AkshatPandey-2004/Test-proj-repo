import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Microservice URLs (hardcoded for simple local setup)
const USER_SERVICE_URL = 'http://localhost:3001';
const MONITORING_SERVICE_URL = 'http://localhost:3002';

app.use(cors()); // Allow frontend to talk to this gateway
app.use(express.json());

// --- Gateway Routing Logic ---

// Route for Login/Saving Credentials (Proxy to User Service)
// Fix: Updated proxy path to match the current User Service route (/api/user/credentials)
app.post('/api/auth/login', async (req, res) => {
    try {
        const response = await axios.post(`${USER_SERVICE_URL}/api/user/credentials`, req.body);
        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data.message : 'Gateway Error: Failed to connect to User Service (3001)';
        res.status(status).send({ message });
    }
});

// Route for Fetching Metrics (Proxy to Monitoring Service) - This path is correct
app.get('/api/data/metrics/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const response = await axios.get(`${MONITORING_SERVICE_URL}/api/metrics/${userId}`);
        res.status(response.status).send(response.data);
    } catch (error) {
        // Handle errors from the downstream microservice
        const status = error.response ? error.response.status : 500;
        // Improve error message clarity for the client
        const message = error.response 
            ? error.response.data.message 
            : 'Gateway Error: Failed to connect to Monitoring Service (3002)';
        res.status(status).send({ message });
    }
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Microservices running on:`);
    console.log(` - User Service: ${USER_SERVICE_URL}`);
    console.log(` - Monitoring Service: ${MONITORING_SERVICE_URL}`);
});
