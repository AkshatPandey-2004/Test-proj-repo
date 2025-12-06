import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand, GetBucketLocationCommand, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";

import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { CostExplorerClient, GetCostAndUsageCommand, GetCostForecastCommand } from "@aws-sdk/client-cost-explorer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';

app.use(cors());
app.use(express.json());

// --- Helper Functions ---

async function getCredentials(userId, regionOverride = null) {
  try {
    console.log(`🔑 Fetching credentials for user: ${userId} from ${USER_SERVICE_URL}`);
    
    const response = await axios.get(`${USER_SERVICE_URL}/api/user/credentials/${userId}/aws`, {
      timeout: 10000
    });
    
    const data = response.data;

    if (!data || !data.decryptedSecret) {
      throw new Error("Invalid response from User Service.");
    }

    const creds = data.decryptedSecret;
    
    // Check if credentials are null or missing - fall back to ENV
    if (!creds.accessKeyId || !creds.secretAccessKey) {
      console.warn('⚠️ User has no stored credentials, falling back to ENV credentials.');
      throw new Error('No user credentials available');
    }
    
    console.log(`✅ Successfully retrieved credentials for user ${userId}`);

    return {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region: regionOverride || creds.region || 'us-east-1',
    };
  } catch (error) {
    console.error(`❌ Failed to fetch credentials: ${error.message}`);
    
    // Fallback to ENV credentials
    const fallbackKeys = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: regionOverride || process.env.AWS_REGION || 'us-east-1',
    };

    if (!fallbackKeys.accessKeyId || !fallbackKeys.secretAccessKey) {
      throw new Error('Could not retrieve valid AWS credentials from user or environment.');
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

// --- Cost Explorer Function ---
async function fetchAWSCosts(credentials) {
    try {
        console.log('💰 Starting cost fetch...');
        
        // Cost Explorer is only available in us-east-1
        const client = new CostExplorerClient({ 
            region: 'us-east-1', 
            credentials 
        });

        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth(); // 0-indexed (0 = January)
        
        // First day of current month
        const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
        
        // Today (current date)
        const today = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate()));
        
        // Last day of current month
        const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
        
        // Format dates as YYYY-MM-DD
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const todayDate = today.toISOString().split('T')[0];
        const endDate = lastDayOfMonth.toISOString().split('T')[0];

        console.log('📅 Date Range:', { startDate, todayDate, endDate });

        // Get current month costs by service (Month to Date)
        const costByServiceCommand = new GetCostAndUsageCommand({
            TimePeriod: {
                Start: startDate,
                End: todayDate
            },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [
                {
                    Type: 'DIMENSION',
                    Key: 'SERVICE'
                }
            ]
        });

        console.log('🔍 Fetching cost by service...');
        const costByServiceData = await client.send(costByServiceCommand);

        // Get daily costs for this month
        const dailyCostCommand = new GetCostAndUsageCommand({
            TimePeriod: {
                Start: startDate,
                End: todayDate
            },
            Granularity: 'DAILY',
            Metrics: ['UnblendedCost']
        });

        console.log('🔍 Fetching daily costs...');
        const dailyCostData = await client.send(dailyCostCommand);

        // Get forecast for rest of month (only if we're not at end of month)
        let forecastData = null;
        const daysRemaining = Math.ceil((lastDayOfMonth - today) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 1) {
            const forecastCommand = new GetCostForecastCommand({
                TimePeriod: {
                    Start: todayDate,
                    End: endDate
                },
                Metric: 'UNBLENDED_COST',
                Granularity: 'MONTHLY'
            });

            try {
                console.log('🔍 Fetching cost forecast...');
                forecastData = await client.send(forecastCommand);
            } catch (forecastError) {
                console.warn('⚠️ Unable to get cost forecast:', forecastError.message);
            }
        } else {
            console.log('⚠️ Too close to end of month, skipping forecast');
        }

        // Process cost by service
        const serviceBreakdown = [];
        let totalCost = 0;

        console.log('📊 Processing service breakdown...');
        if (costByServiceData.ResultsByTime && costByServiceData.ResultsByTime.length > 0) {
            const groups = costByServiceData.ResultsByTime[0].Groups || [];
            console.log(`Found ${groups.length} service groups`);
            
            for (const group of groups) {
                const serviceName = group.Keys[0];
                const amount = parseFloat(group.Metrics.UnblendedCost.Amount);
                
                console.log(`Service: ${serviceName}, Cost: $${amount.toFixed(4)}`);
                
                if (amount > 0.001) { // Include all costs > $0.001
                    serviceBreakdown.push({
                        service: serviceName,
                        cost: amount.toFixed(4), // Keep more precision
                        percentage: 0 // Will calculate after
                    });
                    totalCost += amount;
                }
            }

            // Calculate percentages
            serviceBreakdown.forEach(item => {
                item.percentage = totalCost > 0 
                    ? ((parseFloat(item.cost) / totalCost) * 100).toFixed(1)
                    : '0';
            });

            // Sort by cost descending
            serviceBreakdown.sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));
        } else {
            console.warn('⚠️ No cost data returned from AWS');
        }

        console.log(`💰 Total Cost (Month to Date): $${totalCost.toFixed(4)}`);

        // Process daily costs
        const dailyCosts = [];
        if (dailyCostData.ResultsByTime) {
            console.log(`📅 Processing ${dailyCostData.ResultsByTime.length} daily cost entries`);
            for (const result of dailyCostData.ResultsByTime) {
                const date = result.TimePeriod.Start;
                const amount = parseFloat(result.Total.UnblendedCost.Amount);
                dailyCosts.push({
                    date: date,
                    cost: amount.toFixed(4)
                });
                console.log(`Date: ${date}, Cost: $${amount.toFixed(4)}`);
            }
        }

        // Process forecast
        let estimatedMonthlyTotal = totalCost;
        let forecastAmount = 0;
        
        if (forecastData && forecastData.Total) {
            forecastAmount = parseFloat(forecastData.Total.Amount);
            estimatedMonthlyTotal = totalCost + forecastAmount;
            console.log(`🔮 Forecast for remaining days: $${forecastAmount.toFixed(4)}`);
        }

        console.log(`📊 Estimated Monthly Total: $${estimatedMonthlyTotal.toFixed(4)}`);

        return {
            currentMonthToDate: totalCost.toFixed(2),
            estimatedMonthlyTotal: estimatedMonthlyTotal.toFixed(2),
            currency: 'USD',
            serviceBreakdown: serviceBreakdown.map(s => ({
                ...s,
                cost: parseFloat(s.cost).toFixed(2) // Format to 2 decimals for display
            })),
            dailyCosts: dailyCosts.map(d => ({
                ...d,
                cost: parseFloat(d.cost).toFixed(2) // Format to 2 decimals for display
            })),
            period: {
                start: startDate,
                end: todayDate,
                lastDayOfMonth: endDate
            },
            debug: {
                rawTotal: totalCost,
                forecastAmount: forecastAmount,
                daysInMonth: lastDayOfMonth.getUTCDate(),
                currentDay: today.getUTCDate(),
                daysRemaining: daysRemaining
            }
        };

    } catch (error) {
        console.error('❌ Error fetching AWS costs:', error.message);
        console.error('Full error:', error);
        
        // Return empty data structure on error
        return {
            currentMonthToDate: '0.00',
            estimatedMonthlyTotal: '0.00',
            currency: 'USD',
            serviceBreakdown: [],
            dailyCosts: [],
            period: {
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
            },
            error: error.message
        };
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
// Add this helper function at the top of the file (after imports)

function formatStorageSize(bytes) {
    if (bytes === 0) return { value: '0', unit: 'Bytes', displaySize: '0 Bytes', numericValue: 0 };
    
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    
    if (gb >= 1) {
        return { 
            value: gb.toFixed(2), 
            unit: 'GB', 
            displaySize: `${gb.toFixed(2)} GB`,
            numericValue: gb
        };
    } else if (mb >= 1) {
        return { 
            value: mb.toFixed(2), 
            unit: 'MB', 
            displaySize: `${mb.toFixed(2)} MB`,
            numericValue: mb / 1024 // Convert to GB for calculations
        };
    } else if (kb >= 1) {
        return { 
            value: kb.toFixed(2), 
            unit: 'KB', 
            displaySize: `${kb.toFixed(2)} KB`,
            numericValue: kb / (1024 * 1024) // Convert to GB for calculations
        };
    } else {
        return { 
            value: bytes.toString(), 
            unit: 'Bytes', 
            displaySize: `${bytes} Bytes`,
            numericValue: bytes / (1024 * 1024 * 1024) // Convert to GB for calculations
        };
    }
}

// Now update the fetchS3Buckets function:

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

                console.log(`📦 Processing S3 bucket: ${bucket.Name} in region: ${bucketRegion}`);

                // Get real-time object count and size using ListObjectsV2
                let totalSize = 0;
                let objectCount = 0;
                let continuationToken = null;
                let requestCount = 0;
                const maxRequests = 10; // Limit to prevent long processing times

                do {
                    try {
                        const listParams = {
                            Bucket: bucket.Name,
                            MaxKeys: 1000,
                            ...(continuationToken && { ContinuationToken: continuationToken })
                        };

                        const listCommand = new ListObjectsV2Command(listParams);
                        const listResponse = await s3Client.send(listCommand);

                        if (listResponse.Contents) {
                            objectCount += listResponse.Contents.length;
                            totalSize += listResponse.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
                        }

                        continuationToken = listResponse.NextContinuationToken;
                        requestCount++;

                        // Break if we've made too many requests (for very large buckets)
                        if (requestCount >= maxRequests && continuationToken) {
                            console.log(`⚠️ Bucket ${bucket.Name} has more objects, showing partial count`);
                            objectCount = `${objectCount}+`;
                            break;
                        }

                    } catch (listError) {
                        console.error(`Error listing objects in ${bucket.Name}:`, listError.message);
                        break;
                    }
                } while (continuationToken);

                // Format storage size intelligently
                const storageInfo = formatStorageSize(totalSize);

                console.log(`✅ Bucket ${bucket.Name}: ${objectCount} objects, ${storageInfo.displaySize} (${totalSize} bytes)`);

                buckets.push({
                    name: bucket.Name,
                    creationDate: bucket.CreationDate.toISOString().split('T')[0],
                    numberOfObjects: objectCount.toString(),
                    sizeDisplay: storageInfo.displaySize, // Human readable (e.g., "36.5 KB")
                    sizeInGB: storageInfo.numericValue.toFixed(6), // For calculations (always in GB)
                    sizeInBytes: totalSize, // Raw bytes
                    storageUnit: storageInfo.unit, // KB, MB, GB
                    region: bucketRegion
                });

            } catch (bucketError) {
                console.error(`Error processing bucket ${bucket.Name}:`, bucketError.message);
                
                // Still add the bucket with N/A values if we can't access it
                buckets.push({
                    name: bucket.Name,
                    creationDate: bucket.CreationDate.toISOString().split('T')[0],
                    numberOfObjects: 'N/A',
                    sizeDisplay: 'N/A',
                    sizeInGB: '0',
                    sizeInBytes: 0,
                    storageUnit: 'N/A',
                    region: 'unknown',
                    error: 'Access Denied or Bucket Policy Restriction'
                });
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

// --- API ROUTES ---

// Main Metrics Route
app.get('/api/metrics/:userId', async (req, res) => {
    const { userId } = req.params;
    const { region, services } = req.query;

    try {
        console.log(`📊 Fetching metrics for user: ${userId}, region: ${region || 'default'}`);
        
        const { accessKeyId, secretAccessKey, region: finalRegion } = await getCredentials(userId, region);
        console.log(`🌍 Using region: ${finalRegion}`);

        const credentials = { accessKeyId, secretAccessKey };

        const ec2Client = new EC2Client({ region: finalRegion, credentials });
        const cloudWatchClient = new CloudWatchClient({ region: finalRegion, credentials });
        const s3Client = new S3Client({ region: finalRegion, credentials });
        const rdsClient = new RDSClient({ region: finalRegion, credentials });
        const lambdaClient = new LambdaClient({ region: finalRegion, credentials });

        const servicesToFetch = services ? services.split(',') : ['ec2', 's3', 'rds', 'lambda', 'ebs'];

        const results = {
            region: finalRegion,
            resources: {}
        };

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

// Cost Monitoring Route
app.get('/api/costs/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        console.log(`💰 Fetching cost data for user: ${userId}`);
        
        const { accessKeyId, secretAccessKey } = await getCredentials(userId);
        const credentials = { accessKeyId, secretAccessKey };

        const costData = await fetchAWSCosts(credentials);

        console.log(`✅ Successfully fetched cost data. Total: $${costData.currentMonthToDate}`);

        res.status(200).send(costData);

    } catch (error) {
        console.error('❌ Error in /api/costs:', error);
        res.status(500).send({
            message: error.message || 'Failed to fetch cost data from AWS.',
            currentMonthToDate: '0.00',
            estimatedMonthlyTotal: '0.00',
            currency: 'USD',
            serviceBreakdown: [],
            dailyCosts: []
        });
    }
});

// Debug Cost Route
app.get('/api/costs/debug/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        console.log(`🔍 DEBUG: Fetching cost data for user: ${userId}`);
        
        const { accessKeyId, secretAccessKey } = await getCredentials(userId);
        const credentials = { accessKeyId, secretAccessKey };

        const client = new CostExplorerClient({ 
            region: 'us-east-1', 
            credentials 
        });

        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();
        
        const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
        const today = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate()));
        
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const todayDate = today.toISOString().split('T')[0];

        const command = new GetCostAndUsageCommand({
            TimePeriod: {
                Start: startDate,
                End: todayDate
            },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost', 'BlendedCost', 'AmortizedCost']
        });

        const rawData = await client.send(command);

        res.status(200).send({
            message: 'Raw AWS Cost Explorer Response',
            dateRange: { startDate, todayDate },
            rawResponse: rawData,
            totalUnblended: rawData.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount,
            totalBlended: rawData.ResultsByTime?.[0]?.Total?.BlendedCost?.Amount,
            totalAmortized: rawData.ResultsByTime?.[0]?.Total?.AmortizedCost?.Amount
        });

    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        res.status(500).send({
            error: error.message,
            stack: error.stack
        });
    }
});

app.get('/health', (req, res) => {
  res.status(200).send({ 
    status: 'healthy', 
    service: 'monitoring-service',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
    console.log(`✅ Monitoring Service running on port ${PORT}`);
});