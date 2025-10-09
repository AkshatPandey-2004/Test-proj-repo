import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const USER_SERVICE_URL = 'http://localhost:3001'; 

app.use(cors());
app.use(express.json());

// --- Helper Functions ---

async function getCredentials(userId, regionOverride = null) {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/user/credentials/${userId}/aws`);
    const data = response.data;

    if (!data || !data.decryptedSecret) {
      throw new Error("Invalid response from User Service.");
    }

    const creds = data.decryptedSecret;
    console.log(`✅ Successfully retrieved credentials for user ${userId}`);

    return {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region: regionOverride || creds.region || 'us-east-1',
    };
  } catch (error) {
    console.error(`❌ Failed to fetch credentials: ${error.message}`);
    
    const fallbackKeys = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: regionOverride || process.env.AWS_REGION || 'us-east-1',
    };

    if (!fallbackKeys.accessKeyId || !fallbackKeys.secretAccessKey) {
      throw new Error('Could not retrieve valid AWS credentials.');
    }

    console.warn('⚠️ Using fallback ENV credentials.');
    return fallbackKeys;
  }
}

async function getCloudWatchMetric(client, namespace, metricName, dimensions, statistic) {
    const now = new Date();
    const startTime = new Date(now.getTime() - 1000 * 60 * 5); 
    const endTime = now;

    const params = {
        Namespace: namespace,
        MetricName: metricName,
        Dimensions: dimensions,
        StartTime: startTime,
        EndTime: endTime,
        Period: 60,
        Statistics: [statistic],
    };

    try {
        const command = new GetMetricStatisticsCommand(params);
        const response = await client.send(command);
        
        const dataPoints = response.Datapoints || [];
        if (dataPoints.length > 0) {
            dataPoints.sort((a, b) => b.Timestamp.getTime() - a.Timestamp.getTime());
            return dataPoints[0][statistic];
        }
        return 'N/A';
    } catch (error) {
        console.error(`Error fetching metric ${metricName}:`, error.message);
        return 'N/A';
    }
}

// --- EC2 Instances ---
async function fetchEC2Instances(ec2Client, cloudWatchClient) {
    try {
        const describeCommand = new DescribeInstancesCommand({});
        const ec2Data = await ec2Client.send(describeCommand);

        if (!ec2Data.Reservations || ec2Data.Reservations.length === 0) {
            return [];
        }

        const instances = [];
        for (const reservation of ec2Data.Reservations) {
            for (const instance of reservation.Instances) {
                const instanceId = instance.InstanceId;
                const instanceName = instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed';
                const state = instance.State.Name;

                let cpuUtilization = 'N/A';
                let networkIn = 'N/A';
                let networkOut = 'N/A';

                if (state === 'running') {
                    try {
                        cpuUtilization = await getCloudWatchMetric(
                            cloudWatchClient, 
                            'AWS/EC2', 
                            'CPUUtilization', 
                            [{ Name: 'InstanceId', Value: instanceId }],
                            'Average'
                        );
                        networkIn = await getCloudWatchMetric(
                            cloudWatchClient, 
                            'AWS/EC2', 
                            'NetworkIn', 
                            [{ Name: 'InstanceId', Value: instanceId }],
                            'Sum'
                        );
                        networkOut = await getCloudWatchMetric(
                            cloudWatchClient, 
                            'AWS/EC2', 
                            'NetworkOut', 
                            [{ Name: 'InstanceId', Value: instanceId }],
                            'Sum'
                        );

                        cpuUtilization = typeof cpuUtilization === 'number' ? cpuUtilization.toFixed(2) : 'N/A';
                        networkIn = typeof networkIn === 'number' ? `${(networkIn / 1024).toFixed(2)} KB` : 'N/A';
                        networkOut = typeof networkOut === 'number' ? `${(networkOut / 1024).toFixed(2)} KB` : 'N/A';
                    } catch (metricError) {
                        console.error(`Error fetching metrics for ${instanceId}:`, metricError.message);
                    }
                }

                instances.push({
                    id: instanceId,
                    name: instanceName,
                    state: state,
                    instanceType: instance.InstanceType,
                    metrics: {
                        cpuUtilization,
                        networkIn,
                        networkOut,
                    },
                });
            }
        }
        return instances;
    } catch (error) {
        console.error('❌ Error fetching EC2 instances:', error.message);
        return [];
    }
}

// --- EBS Volumes ---
async function fetchEBSVolumes(ec2Client, cloudWatchClient) {
    try {
        const command = new DescribeVolumesCommand({});
        const volumeData = await ec2Client.send(command);

        if (!volumeData.Volumes || volumeData.Volumes.length === 0) {
            return [];
        }

        const volumes = [];
        for (const volume of volumeData.Volumes) {
            const volumeId = volume.VolumeId;
            const attachedTo = volume.Attachments?.[0]?.InstanceId || 'Not attached';

            let readOps = 'N/A';
            let writeOps = 'N/A';

            if (volume.State === 'in-use') {
                readOps = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/EBS',
                    'VolumeReadOps',
                    [{ Name: 'VolumeId', Value: volumeId }],
                    'Sum'
                );
                writeOps = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/EBS',
                    'VolumeWriteOps',
                    [{ Name: 'VolumeId', Value: volumeId }],
                    'Sum'
                );

                readOps = typeof readOps === 'number' ? readOps.toFixed(0) : 'N/A';
                writeOps = typeof writeOps === 'number' ? writeOps.toFixed(0) : 'N/A';
            }

            volumes.push({
                volumeId: volumeId,
                state: volume.State,
                size: `${volume.Size} GB`,
                volumeType: volume.VolumeType,
                attachedTo: attachedTo,
                availabilityZone: volume.AvailabilityZone,
                metrics: {
                    readOps,
                    writeOps
                }
            });
        }
        return volumes;
    } catch (error) {
        console.error('❌ Error fetching EBS volumes:', error.message);
        return [];
    }
}

// --- S3 Buckets ---
async function fetchS3Buckets(s3Client, cloudWatchClient, region) {
    try {
        const command = new ListBucketsCommand({});
        const bucketData = await s3Client.send(command);

        if (!bucketData.Buckets || bucketData.Buckets.length === 0) {
            return [];
        }

        const buckets = [];
        for (const bucket of bucketData.Buckets) {
            try {
                // Get bucket location
                const locationCommand = new GetBucketLocationCommand({ Bucket: bucket.Name });
                const locationData = await s3Client.send(locationCommand);
                const bucketRegion = locationData.LocationConstraint || 'us-east-1';

                // Only include buckets in the current region
                if (bucketRegion !== region && !(region === 'us-east-1' && !locationData.LocationConstraint)) {
                    continue;
                }

                // Get bucket size from CloudWatch
                let bucketSize = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/S3',
                    'BucketSizeBytes',
                    [
                        { Name: 'BucketName', Value: bucket.Name },
                        { Name: 'StorageType', Value: 'StandardStorage' }
                    ],
                    'Average'
                );

                let numberOfObjects = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/S3',
                    'NumberOfObjects',
                    [
                        { Name: 'BucketName', Value: bucket.Name },
                        { Name: 'StorageType', Value: 'AllStorageTypes' }
                    ],
                    'Average'
                );

                const sizeInGB = typeof bucketSize === 'number' ? (bucketSize / (1024 ** 3)).toFixed(2) : 'N/A';
                const objectCount = typeof numberOfObjects === 'number' ? numberOfObjects.toFixed(0) : 'N/A';

                buckets.push({
                    name: bucket.Name,
                    creationDate: bucket.CreationDate.toISOString().split('T')[0],
                    numberOfObjects: objectCount,
                    sizeInGB: sizeInGB === 'N/A' ? 'N/A' : `${sizeInGB} GB`,
                    region: bucketRegion
                });
            } catch (bucketError) {
                console.error(`Error processing bucket ${bucket.Name}:`, bucketError.message);
            }
        }
        return buckets;
    } catch (error) {
        console.error('❌ Error fetching S3 buckets:', error.message);
        return [];
    }
}

// --- RDS Databases ---
async function fetchRDSInstances(rdsClient, cloudWatchClient) {
    try {
        const command = new DescribeDBInstancesCommand({});
        const rdsData = await rdsClient.send(command);

        if (!rdsData.DBInstances || rdsData.DBInstances.length === 0) {
            return [];
        }

        const databases = [];
        for (const db of rdsData.DBInstances) {
            const dbIdentifier = db.DBInstanceIdentifier;

            let cpuUtilization = 'N/A';
            let connections = 'N/A';

            if (db.DBInstanceStatus === 'available') {
                cpuUtilization = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/RDS',
                    'CPUUtilization',
                    [{ Name: 'DBInstanceIdentifier', Value: dbIdentifier }],
                    'Average'
                );
                connections = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/RDS',
                    'DatabaseConnections',
                    [{ Name: 'DBInstanceIdentifier', Value: dbIdentifier }],
                    'Average'
                );

                cpuUtilization = typeof cpuUtilization === 'number' ? cpuUtilization.toFixed(2) : 'N/A';
                connections = typeof connections === 'number' ? connections.toFixed(0) : 'N/A';
            }

            databases.push({
                identifier: dbIdentifier,
                engine: `${db.Engine} ${db.EngineVersion}`,
                status: db.DBInstanceStatus,
                instanceClass: db.DBInstanceClass,
                storage: `${db.AllocatedStorage} GB`,
                availabilityZone: db.AvailabilityZone,
                metrics: {
                    cpuUtilization,
                    connections
                }
            });
        }
        return databases;
    } catch (error) {
        console.error('❌ Error fetching RDS instances:', error.message);
        return [];
    }
}

// --- Lambda Functions ---
async function fetchLambdaFunctions(lambdaClient, cloudWatchClient) {
    try {
        const command = new ListFunctionsCommand({});
        const lambdaData = await lambdaClient.send(command);

        if (!lambdaData.Functions || lambdaData.Functions.length === 0) {
            return [];
        }

        const functions = [];
        for (const func of lambdaData.Functions) {
            const functionName = func.FunctionName;

            // Get metrics for last 24 hours
            const now = new Date();
            const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            let invocations = 'N/A';
            let errors = 'N/A';
            let duration = 'N/A';

            try {
                const invocationsMetric = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/Lambda',
                    'Invocations',
                    [{ Name: 'FunctionName', Value: functionName }],
                    'Sum'
                );
                const errorsMetric = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/Lambda',
                    'Errors',
                    [{ Name: 'FunctionName', Value: functionName }],
                    'Sum'
                );
                const durationMetric = await getCloudWatchMetric(
                    cloudWatchClient,
                    'AWS/Lambda',
                    'Duration',
                    [{ Name: 'FunctionName', Value: functionName }],
                    'Average'
                );

                invocations = typeof invocationsMetric === 'number' ? invocationsMetric.toFixed(0) : 'N/A';
                errors = typeof errorsMetric === 'number' ? errorsMetric.toFixed(0) : 'N/A';
                duration = typeof durationMetric === 'number' ? `${durationMetric.toFixed(0)} ms` : 'N/A';
            } catch (metricError) {
                console.error(`Error fetching Lambda metrics for ${functionName}:`, metricError.message);
            }

            functions.push({
                name: functionName,
                runtime: func.Runtime,
                lastModified: func.LastModified,
                memorySize: func.MemorySize,
                timeout: func.Timeout,
                metrics: {
                    invocations,
                    errors,
                    avgDuration: duration
                }
            });
        }
        return functions;
    } catch (error) {
        console.error('❌ Error fetching Lambda functions:', error.message);
        return [];
    }
}

// --- Main API Route ---
app.get('/api/metrics/:userId', async (req, res) => {
    const { userId } = req.params;
    const { region, services } = req.query;

    try {
        console.log(`📊 Fetching metrics for user: ${userId}, region: ${region || 'default'}`);
        
        const { accessKeyId, secretAccessKey, region: finalRegion } = await getCredentials(userId, region);
        console.log(`🌍 Using region: ${finalRegion}`);

        const credentials = { accessKeyId, secretAccessKey };

        // Initialize clients
        const ec2Client = new EC2Client({ region: finalRegion, credentials });
        const cloudWatchClient = new CloudWatchClient({ region: finalRegion, credentials });
        const s3Client = new S3Client({ region: finalRegion, credentials });
        const rdsClient = new RDSClient({ region: finalRegion, credentials });
        const lambdaClient = new LambdaClient({ region: finalRegion, credentials });

        // Determine which services to fetch
        const servicesToFetch = services ? services.split(',') : ['ec2', 's3', 'rds', 'lambda', 'ebs'];

        const results = {
            region: finalRegion,
            resources: {}
        };

        // Fetch services in parallel
        const promises = [];

        if (servicesToFetch.includes('ec2')) {
            promises.push(
                fetchEC2Instances(ec2Client, cloudWatchClient)
                    .then(data => { results.resources.ec2 = data; })
                    .catch(err => { 
                        console.error('EC2 fetch error:', err.message);
                        results.resources.ec2 = [];
                    })
            );
        }

        if (servicesToFetch.includes('ebs')) {
            promises.push(
                fetchEBSVolumes(ec2Client, cloudWatchClient)
                    .then(data => { results.resources.ebs = data; })
                    .catch(err => { 
                        console.error('EBS fetch error:', err.message);
                        results.resources.ebs = [];
                    })
            );
        }

        if (servicesToFetch.includes('s3')) {
            promises.push(
                fetchS3Buckets(s3Client, cloudWatchClient, finalRegion)
                    .then(data => { results.resources.s3 = data; })
                    .catch(err => { 
                        console.error('S3 fetch error:', err.message);
                        results.resources.s3 = [];
                    })
            );
        }

        if (servicesToFetch.includes('rds')) {
            promises.push(
                fetchRDSInstances(rdsClient, cloudWatchClient)
                    .then(data => { results.resources.rds = data; })
                    .catch(err => { 
                        console.error('RDS fetch error:', err.message);
                        results.resources.rds = [];
                    })
            );
        }

        if (servicesToFetch.includes('lambda')) {
            promises.push(
                fetchLambdaFunctions(lambdaClient, cloudWatchClient)
                    .then(data => { results.resources.lambda = data; })
                    .catch(err => { 
                        console.error('Lambda fetch error:', err.message);
                        results.resources.lambda = [];
                    })
            );
        }

        await Promise.all(promises);

        console.log(`✅ Successfully fetched data for services: ${Object.keys(results.resources).join(', ')}`);

        res.status(200).send(results);

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