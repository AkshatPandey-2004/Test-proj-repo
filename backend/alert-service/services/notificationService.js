const axios = require('axios');
const emailService = require('./emailService');
const AlertHistory = require('../models/AlertHistory');

class NotificationService {
  async sendNotifications(alert, currentValue, userId) {
    const results = {
      email: false,
      inApp: false,
      webhook: false
    };

    // Send Email Notification
    if (alert.notifications.email.enabled && alert.notifications.email.recipients.length > 0) {
      const emailResult = await emailService.sendAlertEmail(
        alert,
        currentValue,
        alert.notifications.email. recipients
      );
      results. email = emailResult. success;
    }

    // Send In-App Notification (save to history)
    if (alert.notifications.inApp.enabled) {
      try {
        await AlertHistory.create({
          alertId: alert._id,
          userId: userId,
          metric: alert.metric,
          currentValue: currentValue,
          threshold: alert.condition.threshold,
          service: alert.service,
          severity: alert.severity,
          message: `${alert.name}: ${alert.metric} is ${currentValue} (threshold: ${alert.condition.operator} ${alert.condition.threshold})`,
          notificationsSent: {
            email: results.email,
            inApp: true,
            webhook: false
          }
        });
        results.inApp = true;
        console.log('✅ In-app notification created');
      } catch (error) {
        console.error('❌ Failed to create in-app notification:', error);
      }
    }

    // Send Webhook Notification
    if (alert. notifications.webhook.enabled && alert.notifications.webhook.url) {
      try {
        const webhookPayload = {
          alert: {
            name: alert.name,
            description: alert.description,
            severity: alert.severity,
            service: alert.service,
            metric: alert.metric
          },
          trigger: {
            currentValue: currentValue,
            threshold: alert.condition.threshold,
            operator: alert.condition.operator,
            timestamp: new Date().toISOString()
          },
          user: {
            userId: userId
          }
        };

        await axios.post(
          alert.notifications.webhook.url,
          webhookPayload,
          {
            headers: alert.notifications.webhook.headers || { 'Content-Type': 'application/json' },
            timeout: 5000
          }
        );
        results.webhook = true;
        console.log('✅ Webhook notification sent');
      } catch (error) {
        console.error('❌ Failed to send webhook notification:', error. message);
      }
    }

    return results;
  }

  async sendSlackNotification(webhookUrl, alert, currentValue) {
    const color = alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ?  'warning' : 'good';
    
    const payload = {
      attachments: [{
        color: color,
        title: `🚨 ${alert.name}`,
        text: alert.description,
        fields: [
          { title: 'Service', value: alert.service, short: true },
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Current Value', value: currentValue. toString(), short: true },
          { title: 'Threshold', value: `${alert.condition.operator} ${alert.condition.threshold}`, short: true },
          { title: 'Severity', value: alert.severity. toUpperCase(), short: true },
          { title: 'Time', value: new Date().toLocaleString(), short: true }
        ],
        footer: 'CloudOps Alert System',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      await axios. post(webhookUrl, payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();