const MetricHistory = require('../models/MetricHistory');
const axios = require('axios');

const MONITORING_SERVICE_URL = process.env.MONITORING_SERVICE_URL || 'http://monitoring-service:3002';

class DataAggregator {
  async collectAndStoreMetrics(userId) {
    try {
      console.log(`��� Collecting metrics for user ${userId}...`);
      
      // Fetch current metrics from monitoring service via API Gateway
      const response = await axios. get(`http://api-gateway:3003/api/data/metrics/${userId}`, {
        timeout: 10000
      });
      
      const data = response.data;
      
      // The monitoring service returns data under 'resources'
      const metrics = data.resources || data. metrics || data;
      
      if (! metrics) {
        throw new Error('No metrics data returned from monitoring service');
      }

      console.log('Processing metrics for services:', Object.keys(metrics));

      const historyEntries = [];
      const timestamp = new Date();

      // Store EC2 metrics
      if (metrics.ec2 && Array.isArray(metrics.ec2)) {
        const ec2Count = metrics.ec2.length;
        const runningCount = metrics.ec2. filter(i => i.state === 'running').length;
        const cpuValues = metrics.ec2
          .map(i => {
            const cpu = i.metrics?. cpuUtilization;
            if (cpu === 'N/A' || ! cpu) return null;
            return parseFloat(cpu);
          })
          .filter(v => v !== null && !isNaN(v));
        const avgCpu = cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;

        historyEntries.push(
          { userId, service: 'EC2', metricName: 'cpuUtilization', value: avgCpu, timestamp },
          { userId, service: 'EC2', metricName: 'instanceCount', value: ec2Count, timestamp },
          { userId, service: 'EC2', metricName: 'runningInstances', value: runningCount, timestamp }
        );
        console.log(`✅ EC2: ${ec2Count} instances, ${runningCount} running, ${avgCpu.toFixed(2)}% avg CPU`);
      }

      // Store S3 metrics
      if (metrics.s3 && Array.isArray(metrics.s3)) {
        const bucketCount = metrics.s3.length;
        const totalSize = metrics.s3.reduce((sum, b) => sum + (b.sizeInBytes || 0), 0);

        historyEntries.push(
          { userId, service: 'S3', metricName: 'bucketCount', value: bucketCount, timestamp },
          { userId, service: 'S3', metricName: 'totalSize', value: totalSize, timestamp }
        );
        console. log(`✅ S3: ${bucketCount} buckets, ${totalSize} bytes`);
      }

      // Store RDS metrics
      if (metrics. rds && Array.isArray(metrics.rds)) {
        const dbCount = metrics.rds.length;
        const cpuValues = metrics.rds
          . map(db => {
            const cpu = db.metrics?.cpuUtilization;
            if (cpu === 'N/A' || !cpu) return null;
            return parseFloat(cpu);
          })
          .filter(v => v !== null && !isNaN(v));
        const avgCpu = cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;

        historyEntries.push(
          { userId, service: 'RDS', metricName: 'databaseCount', value: dbCount, timestamp },
          { userId, service: 'RDS', metricName: 'cpuUtilization', value: avgCpu, timestamp }
        );
        console.log(`✅ RDS: ${dbCount} databases, ${avgCpu.toFixed(2)}% avg CPU`);
      }

      // Store Lambda metrics
      if (metrics.lambda && Array.isArray(metrics. lambda)) {
        const funcCount = metrics.lambda.length;
        const invocationValues = metrics.lambda
          .map(f => {
            const inv = f.metrics?.invocations;
            if (inv === 'N/A' || ! inv) return 0;
            return parseFloat(inv);
          })
          .filter(v => ! isNaN(v));
        const totalInvocations = invocationValues.reduce((a, b) => a + b, 0);

        historyEntries.push(
          { userId, service: 'Lambda', metricName: 'functionCount', value: funcCount, timestamp },
          { userId, service: 'Lambda', metricName: 'invocations', value: totalInvocations, timestamp }
        );
        console.log(`✅ Lambda: ${funcCount} functions, ${totalInvocations} invocations`);
      }

      // Store EBS metrics
      if (metrics.ebs && Array.isArray(metrics.ebs)) {
        const volumeCount = metrics.ebs. length;
        const totalStorage = metrics.ebs.reduce((sum, v) => {
          const size = v.size ?  parseInt(v.size. replace(/[^0-9]/g, '')) : 0;
          return sum + size;
        }, 0);

        historyEntries.push(
          { userId, service: 'EBS', metricName: 'volumeCount', value: volumeCount, timestamp },
          { userId, service: 'EBS', metricName: 'totalStorage', value: totalStorage, timestamp }
        );
        console.log(`✅ EBS: ${volumeCount} volumes, ${totalStorage} GB`);
      }

      // Bulk insert for performance
      if (historyEntries.length > 0) {
        await MetricHistory.insertMany(historyEntries);
        console. log(`✅ Stored ${historyEntries.length} metric entries for user ${userId}`);
        return { success: true, count: historyEntries.length };
      } else {
        console.log('⚠️ No metrics to store');
        return { success: true, count: 0, message: 'No metrics available to store' };
      }

    } catch (error) {
      console.error(`❌ Error collecting metrics for user ${userId}:`, error. message);
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data);
      }
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DataAggregator();
