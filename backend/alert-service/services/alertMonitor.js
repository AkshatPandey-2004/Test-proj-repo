const cron = require('node-cron');
const axios = require('axios');
const Alert = require('../models/Alert');
const notificationService = require('./notificationService');

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3003';

class AlertMonitor {
  constructor() {
    this.isRunning = false;
  }

  async checkAlerts() {
    try {
      console.log('🔍 Checking alerts... ', new Date(). toLocaleTimeString());

      // Get all enabled alerts
      const alerts = await Alert.find({ enabled: true });
      console.log(`Found ${alerts.length} active alerts`);

      for (const alert of alerts) {
        await this.evaluateAlert(alert);
      }
    } catch (error) {
      console.error('❌ Error checking alerts:', error);
    }
  }

  async evaluateAlert(alert) {
    try {
      // Check cooldown period
      if (alert. lastTriggered) {
        const minutesSinceLastTrigger = (Date.now() - alert.lastTriggered.getTime()) / 1000 / 60;
        if (minutesSinceLastTrigger < alert.cooldownPeriod) {
          console.log(`⏳ Alert "${alert.name}" in cooldown (${minutesSinceLastTrigger. toFixed(1)}/${alert.cooldownPeriod} min)`);
          return;
        }
      }

      // Fetch current metrics from API Gateway
      const currentValue = await this.getCurrentMetricValue(alert);
      
      if (currentValue === null) {
        console.log(`⚠️  Could not get metric value for alert "${alert.name}"`);
        return;
      }

      // Evaluate condition
      const conditionMet = this.evaluateCondition(
        currentValue,
        alert.condition. operator,
        alert.condition. threshold
      );

      if (conditionMet) {
        console.log(`🚨 ALERT TRIGGERED: "${alert.name}" - ${alert.metric} is ${currentValue} (threshold: ${alert.condition.operator} ${alert.condition.threshold})`);
        
        // Send notifications
        await notificationService.sendNotifications(alert, currentValue, alert.userId);

        // Update alert record
        alert.lastTriggered = new Date();
        alert. triggerCount += 1;
        await alert.save();
      }
    } catch (error) {
      console.error(`❌ Error evaluating alert "${alert.name}":`, error);
    }
  }

  async getCurrentMetricValue(alert) {
    try {
      // Fetch metrics from API Gateway based on service
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/data/metrics/${alert.userId}? region=${alert.resourceFilter?. region || 'us-east-1'}`
      );

      const data = response.data;

      // Extract metric value based on service and metric type
      switch (alert.service) {
        case 'EC2':
          return this.getEC2Metric(data. resources. ec2 || [], alert.metric, alert.resourceFilter);
        
        case 'S3':
          return this.getS3Metric(data.resources.s3 || [], alert. metric, alert.resourceFilter);
        
        case 'RDS':
          return this.getRDSMetric(data.resources. rds || [], alert.metric, alert.resourceFilter);
        
        case 'Lambda':
          return this.getLambdaMetric(data.resources.lambda || [], alert.metric, alert.resourceFilter);
        
        case 'EBS':
          return this.getEBSMetric(data.resources.ebs || [], alert.metric, alert.resourceFilter);
        
        case 'Cost':
          return this.getCostMetric(data, alert.metric);
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error fetching metrics for alert "${alert.name}":`, error. message);
      return null;
    }
  }

  getEC2Metric(instances, metric, filter) {
    let targetInstances = instances;
    
    // Filter to only running instances for CPU metrics
    if (metric === 'cpuUtilization') {
      targetInstances = targetInstances.filter(i => i.state === 'running');
    }
    
    // If specific resources specified, filter to those
    if (filter?.monitoringScope === 'specific' && filter?.resourceIds?.length > 0) {
      targetInstances = targetInstances.filter(i => filter.resourceIds.includes(i.id));
    }

    if (targetInstances.length === 0) return null;

    switch (metric) {
      case 'cpuUtilization':
        const cpuValues = targetInstances.map(i => parseFloat(i.metrics.cpuUtilization) || 0);
        return this.applyAggregation(cpuValues, filter?.aggregation || 'average');
      
      case 'instanceCount':
        return targetInstances.length;
      
      case 'runningInstances':
        return targetInstances.filter(i => i.state === 'running').length;
      
      case 'stoppedInstances':
        return targetInstances.filter(i => i.state === 'stopped').length;
      
      default:
        return null;
    }
  }

  getS3Metric(buckets, metric, filter) {
    let targetBuckets = buckets;
    
    // If specific resources specified, filter to those
    if (filter?.monitoringScope === 'specific' && filter?.resourceIds?.length > 0) {
      targetBuckets = buckets.filter(b => filter.resourceIds.includes(b.name));
    }

    if (targetBuckets.length === 0) return null;

    switch (metric) {
      case 'bucketSize':
        const sizeValues = targetBuckets.map(b => parseFloat(b.sizeInGB) || 0);
        const aggregation = filter?.aggregation || 'sum';
        return this.applyAggregation(sizeValues, aggregation);
      
      case 'bucketCount':
        return targetBuckets.length;
      
      case 'objectCount':
        const objectCounts = targetBuckets.map(b => parseInt(b.numberOfObjects) || 0);
        return this.applyAggregation(objectCounts, filter?.aggregation || 'sum');
      
      default:
        return null;
    }
  }

  getRDSMetric(databases, metric, filter) {
    let targetDBs = databases;
    
    // Filter to only available databases for CPU/connections
    if (metric === 'cpuUtilization' || metric === 'connections') {
      targetDBs = targetDBs.filter(db => db.status === 'available');
    }
    
    // If specific resources specified, filter to those
    if (filter?.monitoringScope === 'specific' && filter?.resourceIds?.length > 0) {
      targetDBs = databases.filter(db => filter.resourceIds.includes(db.identifier));
    }

    if (targetDBs.length === 0) return null;

    switch (metric) {
      case 'cpuUtilization':
        const cpuValues = targetDBs.map(db => parseFloat(db.metrics.cpuUtilization) || 0);
        return this.applyAggregation(cpuValues, filter?.aggregation || 'average');
      
      case 'connections':
        const connValues = targetDBs.map(db => parseInt(db.metrics.connections) || 0);
        return this.applyAggregation(connValues, filter?.aggregation || 'sum');
      
      case 'databaseCount':
        return targetDBs.length;
      
      default:
        return null;
    }
  }

  getLambdaMetric(functions, metric, filter) {
    let targetFunctions = functions;
    
    // If specific resources specified, filter to those
    if (filter?.monitoringScope === 'specific' && filter?.resourceIds?.length > 0) {
      targetFunctions = functions.filter(f => filter.resourceIds.includes(f.name));
    }

    if (targetFunctions.length === 0) return null;

    switch (metric) {
      case 'errorRate':
        const totalInvocations = targetFunctions.reduce((sum, f) => sum + (parseInt(f.metrics.invocations) || 0), 0);
        const totalErrors = targetFunctions.reduce((sum, f) => sum + (parseInt(f.metrics.errors) || 0), 0);
        return totalInvocations > 0 ? (totalErrors / totalInvocations) * 100 : 0;
      
      case 'invocations':
        const invocValues = targetFunctions.map(f => parseInt(f.metrics.invocations) || 0);
        return this.applyAggregation(invocValues, filter?.aggregation || 'sum');
      
      case 'errors':
        const errorValues = targetFunctions.map(f => parseInt(f.metrics.errors) || 0);
        return this.applyAggregation(errorValues, filter?.aggregation || 'sum');
      
      default:
        return null;
    }
  }

  getEBSMetric(volumes, metric, filter) {
    let targetVolumes = volumes;
    
    // Filter to only in-use volumes for IOPS metrics
    if (metric === 'readOps' || metric === 'writeOps') {
      targetVolumes = targetVolumes.filter(v => v.state === 'in-use');
    }
    
    // If specific resources specified, filter to those
    if (filter?.monitoringScope === 'specific' && filter?.resourceIds?.length > 0) {
      targetVolumes = volumes.filter(v => filter.resourceIds.includes(v.volumeId));
    }

    if (targetVolumes.length === 0) return null;

    switch (metric) {
      case 'volumeCount':
        return targetVolumes.length;
      
      case 'availableVolumes':
        return targetVolumes.filter(v => v.state === 'available').length;
      
      case 'totalStorage':
        const sizeValues = targetVolumes.map(v => parseFloat(v.size) || 0);
        return this.applyAggregation(sizeValues, filter?.aggregation || 'sum');
      
      default:
        return null;
    }
  }

  getCostMetric(data, metric) {
    // This would need to be implemented based on your cost data structure
    // For now, returning null as cost data structure varies
    return null;
  }

  applyAggregation(values, method) {
    if (!values || values.length === 0) return 0;
    
    switch (method) {
      case 'average':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'maximum':
        return Math.max(...values);
      case 'minimum':
        return Math.min(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      default:
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  evaluateCondition(currentValue, operator, threshold) {
    switch (operator) {
      case '>':
        return currentValue > threshold;
      case '<':
        return currentValue < threshold;
      case '>=':
        return currentValue >= threshold;
      case '<=':
        return currentValue <= threshold;
      case '==':
        return currentValue === threshold;
      case '!=':
        return currentValue !== threshold;
      default:
        return false;
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Alert monitor is already running');
      return;
    }

    // Run every minute
    this.cronJob = cron.schedule('*/1 * * * *', () => {
      this.checkAlerts();
    });

    // Run immediately on start
    this.checkAlerts();

    this.isRunning = true;
    console.log('✅ Alert monitor started - checking every 1 minute');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('⏹️  Alert monitor stopped');
    }
  }
}

module.exports = new AlertMonitor();