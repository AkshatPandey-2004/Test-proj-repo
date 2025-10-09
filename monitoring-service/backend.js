import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const USER_SERVICE_URL = 'http://localhost:3001'; 

app.use(cors());
app.use(express.json());

// --- Helper Functions ---

/**
 * Fetches required credentials (keys and region) from the User Service.
 * Corrected API path to include '/user' and '/aws' provider.
 */
async function getCredentials(userId) {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/user/credentials/${userId}/aws`);
    const data = response.data;

    if (!data || !data.decryptedSecret) {
      throw new Error("Invalid response from User Service.");
    }

    const creds = data.decryptedSecret;
    console.log(`✅ Successfully retrieved credentials for user ${userId} from User Service.`);

    return {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region: creds.region || 'us-east-1',
    };
  } catch (error) {
    console.error(`❌ Failed to fetch credentials for user ${userId}: ${error.message}`);
    
    // Fallback (for debugging)
    const fallbackKeys = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    };

    if (!fallbackKeys.accessKeyId || !fallbackKeys.secretAccessKey) {
      throw new Error('Could not retrieve valid AWS credentials from User Service or environment variables.');
    }

    console.warn('⚠️ Using fallback ENV credentials.');
    return fallbackKeys;
  }
}


/**
 * Fetches a single CloudWatch metric statistic for a specific instance.
 */
async function getCloudWatchMetric(client, instanceId, metricName, statistic) {
    const now = new Date();
    // Fetch data for the last 5 minutes, summarized every minute (60s period)
    const startTime = new Date(now.getTime() - 1000 * 60 * 5); 
    const endTime = now;

    const params = {
        Namespace: 'AWS/EC2',
        MetricName: metricName,
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: startTime,
        EndTime: endTime,
        Period: 60, // 1 minute
        Statistics: [statistic],
    };

    const command = new GetMetricStatisticsCommand(params);
    const response = await client.send(command);
    
    // Process Datapoints to get the latest value
    const dataPoints = response.Datapoints || [];
    if (dataPoints.length > 0) {
        // Sort by timestamp and get the latest
        dataPoints.sort((a, b) => b.Timestamp.getTime() - a.Timestamp.getTime());
        // Return the requested statistic value (e.g., Average, Sum)
        return dataPoints[0][statistic];
    }
    return 'N/A';
}

// --- API Route ---

app.get('/api/metrics/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // 1. Get credentials (either from User Service or ENV fallback)
        const { accessKeyId, secretAccessKey, region } = await getCredentials(userId);

        // 2. Initialize AWS clients using the retrieved temporary credentials
        const awsConfig = {
            region: region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        };
        const ec2Client = new EC2Client(awsConfig);
        const cwClient = new CloudWatchClient(awsConfig);

        // 3. Get list of EC2 instances
        const describeCommand = new DescribeInstancesCommand({});
        const ec2Response = await ec2Client.send(describeCommand);

        let resources = [];

        for (const reservation of ec2Response.Reservations || []) {
            for (const instance of reservation.Instances || []) {
                const instanceId = instance.InstanceId;
                const nameTag = instance.Tags?.find(tag => tag.Key === 'Name')?.Value || instanceId;

                // 4. Fetch metrics for each instance (simultaneously for speed)
                const [cpu, networkIn, networkOut] = await Promise.all([
                    // Changed period to 5 minutes to get more immediate data points
                    getCloudWatchMetric(cwClient, instanceId, 'CPUUtilization', 'Average'),
                    getCloudWatchMetric(cwClient, instanceId, 'NetworkIn', 'Sum'),
                    getCloudWatchMetric(cwClient, instanceId, 'NetworkOut', 'Sum'),
                ]);

                resources.push({
                    type: 'EC2',
                    id: instanceId,
                    name: nameTag,
                    state: instance.State?.Name,
                    metrics: {
                        // Format the data
                        cpuUtilization: typeof cpu === 'number' ? cpu.toFixed(2) : 'N/A', // Removed % for easier math on frontend
                        networkIn: typeof networkIn === 'number' ? (networkIn / 1024 / 1024).toFixed(2) + ' MiB' : 'N/A', 
                        networkOut: typeof networkOut === 'number' ? (networkOut / 1024 / 1024).toFixed(2) + ' MiB' : 'N/A',
                    },
                });
            }
        }

        res.status(200).json({ region: awsConfig.region, resources });
    } catch (error) {
        // The console log will now show the underlying AWS error more clearly
        console.error('Monitoring Service AWS Error:', error.message);
        // Send a clean error message back to the frontend
        res.status(500).json({ 
            message: 'Metrics Error: Failed to fetch AWS data. Check credentials, IAM permissions, or region.', 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Monitoring Service listening on port ${PORT}`);
});
