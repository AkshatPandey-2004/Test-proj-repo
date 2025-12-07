module.exports = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env. SMTP_USER, // Your email
      pass: process.env. SMTP_PASS  // App password (not regular password)
    }
  },
  from: {
    name: 'CloudOps Alert System',
    email: process.env. SMTP_USER || 'noreply@cloudops.com'
  },
  templates: {
    alertTriggered: (alert, currentValue) => ({
      subject: `🚨 [${alert.severity. toUpperCase()}] ${alert. name}`,
      html: `
        <! DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: ${alert.severity === 'critical' ? '#fee2e2' : alert.severity === 'warning' ?  '#fef3c7' : '#dbeafe'}; 
                        border-left: 4px solid ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ?  '#f59e0b' : '#3b82f6'};
                        padding: 20px; margin: 20px 0; border-radius: 5px; }
            .metric { font-size: 32px; font-weight: bold; color: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ?  '#f59e0b' : '#3b82f6'}; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Alert Triggered</h1>
              <p>Your CloudOps monitoring system has detected an issue</p>
            </div>
            <div class="content">
              <h2>${alert.name}</h2>
              <p>${alert.description || 'Alert condition has been met'}</p>
              
              <div class="alert-box">
                <p><strong>Service:</strong> ${alert.service}</p>
                <p><strong>Metric:</strong> ${alert.metric}</p>
                <p><strong>Condition:</strong> ${alert.metric} ${alert.condition. operator} ${alert.condition.threshold}</p>
                <p><strong>Current Value:</strong> <span class="metric">${currentValue}</span></p>
                <p><strong>Severity:</strong> <span style="text-transform: uppercase; font-weight: bold;">${alert. severity}</span></p>
                <p><strong>Triggered At:</strong> ${new Date().toLocaleString()}</p>
                ${alert.resourceFilter?.monitoringScope === 'specific' && alert.resourceFilter?.resourceIds?.length ? `
                  <p><strong>Monitoring Scope:</strong> Specific Resources</p>
                  <p><strong>Aggregation:</strong> ${alert.resourceFilter.aggregation || 'average'}</p>
                ` : `<p><strong>Monitoring Scope:</strong> All Resources (Average)</p>`}
              </div>

              ${alert.resourceFilter?.resourceIds?.length ?  `
                <p><strong>Monitored Resources:</strong></p>
                <ul>
                  ${alert.resourceFilter.resourceIds.map(id => `<li>${id}</li>`).join('')}
                </ul>
              ` : ''}

              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
                View Dashboard
              </a>

              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This alert will not trigger again for ${alert.cooldownPeriod} minutes.
              </p>
            </div>
            <div class="footer">
              <p>CloudOps Alert System | <a href="${process.env.FRONTEND_URL}/alerts">Manage Alerts</a></p>
              <p>You're receiving this because you created an alert for this metric. </p>
            </div>
          </div>
        </body>
        </html>
      `
    })
  }
};