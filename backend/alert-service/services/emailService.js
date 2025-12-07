const nodemailer = require('nodemailer');
const emailConfig = require('../config/emailConfig');

class EmailService {
   constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env. SMTP_HOST || 'smtp. gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process. env.SMTP_PASS
      }
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error. message);
      return false;
    }
  }

  async sendAlertEmail(alert, currentValue, recipients) {
    try {
      const template = emailConfig.templates.alertTriggered(alert, currentValue);
      
      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: recipients. join(', '),
        subject: template.subject,
        html: template.html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Alert email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console. error('❌ Failed to send alert email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(email) {
    try {
      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: email,
        subject: '✅ CloudOps Alert Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🎉 Test Email Successful! </h2>
            <p>Your email notification settings are configured correctly.</p>
            <p>You will now receive alerts from CloudOps monitoring system.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">CloudOps Alert System</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console. log(`✅ Test email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();