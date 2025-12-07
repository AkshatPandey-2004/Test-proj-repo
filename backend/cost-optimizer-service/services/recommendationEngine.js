const CostRecommendation = require('../models/CostRecommendation');
const axios = require('axios');

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:3003';

class RecommendationEngine {
  
  async generateRecommendations(userId) {
    try {
      console.log(`🤖 Generating cost recommendations for user ${userId}...`);
      
      // Fetch current resources
      const response = await axios.get(`${API_GATEWAY_URL}/api/data/metrics/${userId}`);
      const resources = response.data.resources;
      
      const recommendations = [];
      
      // 1. Analyze EC2 Instances for idle/underutilized
      if (resources.ec2 && resources.ec2.length > 0) {
        const idleInstances = resources.ec2.filter(instance => {
          const cpu = parseFloat(instance.metrics.cpuUtilization);
          return instance.state === 'running' && (! isNaN(cpu) && cpu < 5);
        });
        
        if (idleInstances.length > 0) {
          const savings = idleInstances.length * 15; // Estimate $15/month per t2.micro
          recommendations.push({
            userId,
            type: 'EC2_IDLE',
            priority: 'High',
            title: `Stop ${idleInstances.length} idle EC2 instance${idleInstances.length > 1 ? 's' : ''}`,
            description: `${idleInstances.length} EC2 instance(s) running with less than 5% CPU utilization. Consider stopping or downsizing. `,
            estimatedMonthlySavings: savings,
            estimatedYearlySavings: savings * 12,
            difficulty: 'Easy',
            implementationTime: '2 minutes',
            resourceDetails: {
              instances: idleInstances.map(i => ({ id: i.id, name: i.name, cpu: i.metrics.cpuUtilization }))
            },
            impact: 'Low Impact',
            category: 'Compute',
            autoImplementable: true
          });
        }
        
        // Check for stopped instances that can be terminated
        const stoppedInstances = resources.ec2.filter(i => i.state === 'stopped');
        if (stoppedInstances.length > 0) {
          recommendations.push({
            userId,
            type: 'EC2_STOPPED',
            priority: 'Medium',
            title: `Terminate ${stoppedInstances.length} stopped EC2 instance${stoppedInstances.length > 1 ? 's' : ''}`,
            description: `${stoppedInstances.length} EC2 instance(s) are stopped.  You're still paying for EBS storage.`,
            estimatedMonthlySavings: stoppedInstances.length * 8,
            estimatedYearlySavings: stoppedInstances.length * 8 * 12,
            difficulty: 'Easy',
            implementationTime: '1 minute',
            resourceDetails: {
              instances: stoppedInstances.map(i => ({ id: i.id, name: i.name }))
            },
            impact: 'No Impact',
            category: 'Compute',
            autoImplementable: true
          });
        }
      }
      
      // 2. S3 Lifecycle Policies
      if (resources.s3 && resources.s3.length > 0) {
        const largeBuckets = resources.s3.filter(bucket => bucket.sizeInBytes > 1000000000); // > 1GB
        
        if (largeBuckets. length > 0) {
          const savings = largeBuckets. length * 12;
          recommendations.push({
            userId,
            type: 'S3_LIFECYCLE',
            priority: 'Medium',
            title: `Enable S3 Lifecycle policies on ${largeBuckets.length} bucket${largeBuckets.length > 1 ? 's' : ''}`,
            description: `Move infrequently accessed data to S3 Glacier to reduce storage costs by up to 70%. `,
            estimatedMonthlySavings: savings,
            estimatedYearlySavings: savings * 12,
            difficulty: 'Medium',
            implementationTime: '10 minutes',
            resourceDetails: {
              buckets: largeBuckets.map(b => ({ name: b.name, size: b.sizeDisplay }))
            },
            impact: 'Low Impact',
            category: 'Storage',
            autoImplementable: false
          });
        }
      }
      
      // 3. RDS Rightsizing
      if (resources.rds && resources.rds.length > 0) {
        const underutilizedDBs = resources.rds.filter(db => {
          const cpu = parseFloat(db.metrics.cpuUtilization);
          return ! isNaN(cpu) && cpu < 20;
        });
        
        if (underutilizedDBs.length > 0) {
          const savings = underutilizedDBs.length * 89;
          recommendations.push({
            userId,
            type: 'RDS_RIGHTSIZING',
            priority: 'High',
            title: `Downsize ${underutilizedDBs.length} over-provisioned RDS database${underutilizedDBs. length > 1 ? 's' : ''}`,
            description: `RDS instances running at <20% CPU.  Consider downsizing to a smaller instance type.`,
            estimatedMonthlySavings: savings,
            estimatedYearlySavings: savings * 12,
            difficulty: 'Medium',
            implementationTime: '15 minutes',
            resourceDetails: {
              databases: underutilizedDBs.map(db => ({ identifier: db.identifier, cpu: db.metrics.cpuUtilization, class: db.instanceClass }))
            },
            impact: 'Medium Impact',
            category: 'Database',
            autoImplementable: false
          });
        }
      }
      
      // 4. EBS Optimization
      if (resources.ebs && resources.ebs.length > 0) {
        const unattachedVolumes = resources.ebs.filter(v => v.state !== 'in-use');
        
        if (unattachedVolumes. length > 0) {
          const totalSize = unattachedVolumes. reduce((sum, v) => {
            return sum + parseInt(v.size. replace(/[^0-9]/g, ''));
          }, 0);
          const savings = Math.round(totalSize * 0.10); // $0.10 per GB/month
          
          recommendations.push({
            userId,
            type: 'EBS_UNUSED',
            priority: 'High',
            title: `Delete ${unattachedVolumes. length} unused EBS volume${unattachedVolumes. length > 1 ? 's' : ''}`,
            description: `${totalSize} GB of unattached EBS volumes costing you money. `,
            estimatedMonthlySavings: savings,
            estimatedYearlySavings: savings * 12,
            difficulty: 'Easy',
            implementationTime: '2 minutes',
            resourceDetails: {
              volumes: unattachedVolumes.map(v => ({ volumeId: v.volumeId, size: v.size, type: v.volumeType }))
            },
            impact: 'No Impact',
            category: 'Storage',
            autoImplementable: true
          });
        }
      }
      
      // 5. Reserved Instance Recommendation
      if (resources.ec2 && resources.ec2.length >= 2) {
        const runningCount = resources.ec2. filter(i => i.state === 'running').length;
        if (runningCount >= 2) {
          const savings = Math.round(runningCount * 15 * 0.4); // 40% savings
          recommendations.push({
            userId,
            type: 'RESERVED_INSTANCES',
            priority: 'Medium',
            title: `Switch to Reserved Instances`,
            description: `You have ${runningCount} consistently running instances. Save up to 40% with Reserved Instances.`,
            estimatedMonthlySavings: savings,
            estimatedYearlySavings: savings * 12,
            difficulty: 'Easy',
            implementationTime: '5 minutes',
            resourceDetails: {
              currentInstances: runningCount,
              potentialSavingsPercentage: 40
            },
            impact: 'No Impact',
            category: 'Compute',
            autoImplementable: false
          });
        }
      }
      
      // Save recommendations to database (replace existing ones)
      await CostRecommendation.deleteMany({ userId, implemented: false });
      
      if (recommendations.length > 0) {
        await CostRecommendation.insertMany(recommendations);
        console.log(`✅ Generated ${recommendations.length} recommendations`);
      } else {
        console.log(`✅ No recommendations at this time - infrastructure is optimized! `);
      }
      
      return { success: true, count: recommendations.length, recommendations };
      
    } catch (error) {
      console. error(`❌ Error generating recommendations:`, error.message);
      return { success: false, error: error. message };
    }
  }
  
  async getRecommendations(userId, filters = {}) {
    try {
      const query = { userId };
      
      if (filters.implemented !== undefined) {
        query.implemented = filters.implemented;
      }
      
      if (filters. priority) {
        query.priority = filters.priority;
      }
      
      if (filters. category) {
        query.category = filters.category;
      }
      
      const recommendations = await CostRecommendation.find(query).sort({ priority: 1, estimatedMonthlySavings: -1 });
      
      return recommendations;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }
  
  async getTotalSavingsPotential(userId) {
    const recommendations = await CostRecommendation.find({ userId, implemented: false });
    
    const totalMonthly = recommendations.reduce((sum, r) => sum + r.estimatedMonthlySavings, 0);
    const totalYearly = totalMonthly * 12;
    
    return {
      totalMonthlySavings: totalMonthly,
      totalYearlySavings: totalYearly,
      recommendationCount: recommendations.length
    };
  }
  
  async verifyImplementation(recommendationId, userId) {
    try {
      console.log(`🔍 Verifying implementation for recommendation ${recommendationId}...`);
      
      const recommendation = await CostRecommendation.findById(recommendationId);
      if (!recommendation) {
        return { verified: false, reason: 'Recommendation not found' };
      }
      
      // Fetch current resources to compare
      const response = await axios.get(`${API_GATEWAY_URL}/api/data/metrics/${userId}`);
      const resources = response.data.resources;
      
      let verified = false;
      let reason = '';
      
      // Verify based on recommendation type
      switch (recommendation.type) {
        case 'EC2_IDLE':
          // Check if idle instances are now stopped or terminated
          const instanceIds = recommendation.resourceDetails.instances.map(i => i.id);
          const currentInstances = resources.ec2 || [];
          const stillRunning = currentInstances.filter(inst => 
            instanceIds.includes(inst.id) && inst.state === 'running'
          );
          
          if (stillRunning.length === 0) {
            verified = true;
            reason = 'All idle instances have been stopped or terminated';
          } else {
            verified = false;
            reason = `${stillRunning.length} instance(s) are still running: ${stillRunning.map(i => i.name).join(', ')}`;
          }
          break;
          
        case 'EC2_STOPPED':
          // Check if stopped instances were terminated
          const stoppedIds = recommendation.resourceDetails.instances.map(i => i.id);
          const currentEC2 = resources.ec2 || [];
          const stillExists = currentEC2.filter(inst => stoppedIds.includes(inst.id));
          
          if (stillExists.length === 0) {
            verified = true;
            reason = 'All stopped instances have been terminated';
          } else {
            verified = false;
            reason = `${stillExists.length} instance(s) still exist: ${stillExists.map(i => i.name).join(', ')}`;
          }
          break;
          
        case 'EBS_UNUSED':
          // Check if volumes were deleted
          const volumeIds = recommendation.resourceDetails.volumes.map(v => v.volumeId);
          const currentVolumes = resources.ebs || [];
          const volumesStillExist = currentVolumes.filter(vol => volumeIds.includes(vol.volumeId));
          
          if (volumesStillExist.length === 0) {
            verified = true;
            reason = 'All unused EBS volumes have been deleted';
          } else {
            verified = false;
            reason = `${volumesStillExist.length} volume(s) still exist: ${volumesStillExist.map(v => v.volumeId).join(', ')}`;
          }
          break;
          
        case 'RDS_RIGHTSIZING':
          // Check if CPU utilization increased (indicates downsizing)
          const dbIdentifiers = recommendation.resourceDetails.databases.map(db => db.identifier);
          const currentDBs = resources.rds || [];
          const foundDBs = currentDBs.filter(db => dbIdentifiers.includes(db.identifier));
          
          if (foundDBs.length === 0) {
            verified = true;
            reason = 'Database instances have been removed or modified';
          } else {
            const stillUnderutilized = foundDBs.filter(db => {
              const cpu = parseFloat(db.metrics.cpuUtilization);
              return !isNaN(cpu) && cpu < 20;
            });
            
            if (stillUnderutilized.length === 0) {
              verified = true;
              reason = 'Database instances have been rightsized (CPU utilization improved)';
            } else {
              verified = false;
              reason = `${stillUnderutilized.length} database(s) still underutilized`;
            }
          }
          break;
          
        case 'S3_LIFECYCLE':
        case 'RESERVED_INSTANCES':
          // Manual verification required - these changes can't be automatically verified
          verified = true;
          reason = 'Manual verification - please confirm changes were made';
          break;
          
        default:
          verified = false;
          reason = 'Unknown recommendation type';
      }
      
      // Update verification status
      await CostRecommendation.findByIdAndUpdate(
        recommendationId,
        {
          verificationStatus: verified ? 'verified' : 'failed',
          verificationReason: reason,
          verifiedAt: new Date()
        }
      );
      
      console.log(`✅ Verification ${verified ? 'passed' : 'failed'}: ${reason}`);
      return { verified, reason };
      
    } catch (error) {
      console.error('❌ Error verifying implementation:', error.message);
      return { verified: false, reason: `Verification error: ${error.message}` };
    }
  }
  
  async markAsImplemented(recommendationId, actualSavings = null) {
    try {
      const update = {
        implemented: true,
        implementedAt: new Date()
      };
      
      if (actualSavings !== null) {
        update.actualSavings = actualSavings;
      }
      
      const recommendation = await CostRecommendation.findByIdAndUpdate(
        recommendationId,
        update,
        { new: true }
      );
      
      return recommendation;
    } catch (error) {
      console.error('Error marking recommendation as implemented:', error);
      throw error;
    }
  }
}

module.exports = new RecommendationEngine();