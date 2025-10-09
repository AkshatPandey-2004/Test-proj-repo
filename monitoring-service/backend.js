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
 * Now also accepts a region override parameter
 */
async function getCredentials(userId, regionOverride = null) {
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
      region: regionOverride || creds.region || 'us-east-1', // Use override if provided
    };
  } catch (error) {
    console.error(`❌ Failed to fetch credentials for user ${userId}: ${error.message}`);
    
    // Fallback (for debugging)
    const fallbackKeys = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: regionOverride || process.env.AWS_REGION || 'us-east-1',
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
    const startTime = new Date(now.getTime() - 1000 * 60 * 5); 
    const endTime = now;

    const params = {
        Namespace: 'AWS/EC2',
        MetricName: metricName,
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: startTime,
        EndTime: endTime,
        Period: 60,
        Statistics: [statistic],
    };

    const command = new GetMetricStatisticsCommand(params);
    const response = await client.send(command);
    
    const dataPoints = response.Datapoints || [];
    if (dataPoints.length > 0) {
        dataPoints.sort((a, b) => b.Timestamp.getTime() - a.Timestamp.getTime());
        return dataPoints[0][statistic];
    }
    return 'N/A';
}

// --- API Route with Region Support ---

app.get('/api/metrics/:userId', async (req, res) => {
    const { userId } = req.params;
    const { region } = req.query; // Get region from query parameter

    try {
        console.log(`📊 Fetching metrics for user: ${userId}, region: ${region || 'default'}`);
        
        // 1. Get credentials with optional region override
        const { accessKeyId, secretAccessKey, region: finalRegion } = await getCredentials(userId, region);

        console.log(`🌍 Using region: ${finalRegion}`);

        // 2. Initialize AWS SDK clients with the specified region
        const ec2Client = new EC2Client({
            region: finalRegion,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const cloudWatchClient = new CloudWatchClient({
            region: finalRegion,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // 3. Describe EC2 instances in the specified region
        const describeCommand = new DescribeInstancesCommand({});
        const ec2Data = await ec2Client.send(describeCommand);

        if (!ec2Data.Reservations || ec2Data.Reservations.length === 0) {
            return res.status(200).send({
                message: `No EC2 instances found in region ${finalRegion}.`,
                region: finalRegion,
                resources: []
            });
        }

        // 4. Process instances and fetch metrics
        const instances = [];
        for (const reservation of ec2Data.Reservations) {
            for (const instance of reservation.Instances) {
                const instanceId = instance.InstanceId;
                const instanceName = instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed';
                const state = instance.State.Name;

                // Fetch CloudWatch metrics only for running instances
                let cpuUtilization = 'N/A';
                let networkIn = 'N/A';
                let networkOut = 'N/A';

                if (state === 'running') {
                    try {
                        cpuUtilization = await getCloudWatchMetric(cloudWatchClient, instanceId, 'CPUUtilization', 'Average');
                        networkIn = await getCloudWatchMetric(cloudWatchClient, instanceId, 'NetworkIn', 'Sum');
                        networkOut = await getCloudWatchMetric(cloudWatchClient, instanceId, 'NetworkOut', 'Sum');

                        // Format values
                        cpuUtilization = typeof cpuUtilization === 'number' ? cpuUtilization.toFixed(2) : 'N/A';
                        networkIn = typeof networkIn === 'number' ? `${(networkIn / 1024).toFixed(2)} KB` : 'N/A';
                        networkOut = typeof networkOut === 'number' ? `${(networkOut / 1024).toFixed(2)} KB` : 'N/A';
                    } catch (metricError) {
                        console.error(`⚠️ Error fetching metrics for ${instanceId}:`, metricError.message);
                    }
                }

                instances.push({
                    id: instanceId,
                    name: instanceName,
                    state: state,
                    metrics: {
                        cpuUtilization,
                        networkIn,
                        networkOut,
                    },
                });
            }
        }

        console.log(`✅ Successfully fetched ${instances.length} instances from ${finalRegion}`);

        res.status(200).send({
            region: finalRegion,
            resources: instances,
        });

    } catch (error) {
        console.error('❌ Error in /api/metrics:', error);
        res.status(500).send({
            message: error.message || 'Failed to fetch metrics from AWS.',
            region: region || 'unknown'
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Monitoring Service running on port ${PORT}`);
});