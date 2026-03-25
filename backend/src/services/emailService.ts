import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  private get fromAddress(): string {
    return `"${process.env.SMTP_FROM_NAME || 'CourseBit'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;
  }

  private get frontendUrl(): string {
    return process.env.FRONTEND_URL || '';
  }

  private baseTemplate(title: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .header p { color: #e0e7ff; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1f2937; margin-top: 0; }
    .body p { color: #4b5563; line-height: 1.6; }
    .btn { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px 32px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .info-box { background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-box p { margin: 4px 0; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CourseBit</h1>
      <p>AI-Powered Course Generator</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} CourseBit. All rights reserved.</p>
      <p><a href="${this.frontendUrl}/terms" style="color: #6366f1;">Terms</a> &middot; <a href="${this.frontendUrl}/privacy" style="color: #6366f1;">Privacy</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (error: any) {
      console.error('Email send failed:', error.message);
      // Don't crash the request
    }
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = this.baseTemplate(
      'Welcome to CourseBit',
      `<h2>Welcome, ${name}!</h2>
      <p>Thank you for joining CourseBit. You're now ready to create AI-powered courses in minutes.</p>
      <p>With CourseBit, you can:</p>
      <ul style="color: #4b5563; line-height: 2;">
        <li>Generate complete courses using AI (Gemini or GPT-4o)</li>
        <li>Create quizzes and earn certificates</li>
        <li>Export courses as PDF or PowerPoint</li>
        <li>Generate audio versions of your courses</li>
      </ul>
      <a href="${this.frontendUrl}/create" class="btn">Create Your First Course</a>
      <p>If you have any questions, feel free to <a href="${this.frontendUrl}/contact" style="color: #6366f1;">contact us</a>.</p>`
    );
    await this.send(email, 'Welcome to CourseBit!', html);
  }

  async sendForgotPassword(email: string, name: string, token: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password/${token}`;
    const html = this.baseTemplate(
      'Reset Your Password',
      `<h2>Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${resetLink}" class="btn">Reset Password</a>
      <p style="font-size: 13px; color: #9ca3af;">This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
      <p style="font-size: 12px; color: #9ca3af;">If the button doesn't work, copy and paste this link: ${resetLink}</p>`
    );
    await this.send(email, 'Reset Your Password - CourseBit', html);
  }

  async sendSubscriptionConfirmation(
    email: string,
    name: string,
    plan: string,
    amount: number,
    currency: string,
    renewalDate: Date
  ): Promise<void> {
    const html = this.baseTemplate(
      'Subscription Confirmed',
      `<h2>Subscription Activated!</h2>
      <p>Hi ${name},</p>
      <p>Your subscription has been activated successfully.</p>
      <div class="info-box">
        <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
        <p><strong>Amount:</strong> ${amount.toFixed(2)} ${currency.toUpperCase()}</p>
        <p><strong>Next renewal:</strong> ${renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>You now have full access to all premium features including video courses, audio downloads, PPT exports, and unlimited course creation.</p>
      <a href="${this.frontendUrl}/dashboard" class="btn">Go to Dashboard</a>`
    );
    await this.send(email, 'Subscription Confirmed - CourseBit', html);
  }

  async sendRecurringPayment(
    email: string,
    name: string,
    plan: string,
    amount: number,
    currency: string,
    receiptUrl?: string
  ): Promise<void> {
    const html = this.baseTemplate(
      'Payment Received',
      `<h2>Payment Received</h2>
      <p>Hi ${name},</p>
      <p>We've processed your recurring payment.</p>
      <div class="info-box">
        <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
        <p><strong>Amount:</strong> ${amount.toFixed(2)} ${currency.toUpperCase()}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      ${receiptUrl ? `<a href="${receiptUrl}" class="btn">View Receipt</a>` : ''}
      <p>Your premium access continues without interruption.</p>`
    );
    await this.send(email, 'Payment Received - CourseBit', html);
  }

  async sendSubscriptionCancelled(
    email: string,
    name: string,
    accessExpiresAt: Date
  ): Promise<void> {
    const html = this.baseTemplate(
      'Subscription Cancelled',
      `<h2>Subscription Cancelled</h2>
      <p>Hi ${name},</p>
      <p>Your subscription has been cancelled. You'll continue to have premium access until:</p>
      <div class="info-box">
        <p><strong>Access expires:</strong> ${accessExpiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>After this date, your account will revert to the free plan. Your courses and data will be preserved.</p>
      <p>Changed your mind? You can resubscribe anytime.</p>
      <a href="${this.frontendUrl}/billing" class="btn">Resubscribe</a>`
    );
    await this.send(email, 'Subscription Cancelled - CourseBit', html);
  }

  async sendSubscriptionModified(
    email: string,
    name: string,
    newPlan: string
  ): Promise<void> {
    const html = this.baseTemplate(
      'Subscription Updated',
      `<h2>Subscription Updated</h2>
      <p>Hi ${name},</p>
      <p>Your subscription has been updated.</p>
      <div class="info-box">
        <p><strong>New Plan:</strong> ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}</p>
      </div>
      <p>Your new plan benefits are now active.</p>
      <a href="${this.frontendUrl}/dashboard" class="btn">Go to Dashboard</a>`
    );
    await this.send(email, 'Subscription Updated - CourseBit', html);
  }

  async sendCertificateEarned(
    email: string,
    name: string,
    courseName: string,
    certificateId: string
  ): Promise<void> {
    const downloadLink = `${this.frontendUrl}/certificate/${certificateId}`;
    const html = this.baseTemplate(
      'Certificate Earned',
      `<h2>Congratulations, ${name}!</h2>
      <p>You've earned a certificate of completion!</p>
      <div class="info-box">
        <p><strong>Course:</strong> ${courseName}</p>
        <p><strong>Completed:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <a href="${downloadLink}" class="btn">View & Download Certificate</a>
      <p>Share your achievement and keep learning!</p>`
    );
    await this.send(email, `Certificate Earned: ${courseName} - CourseBit`, html);
  }

  async sendContactReply(
    email: string,
    name: string,
    originalMessage: string,
    replyText: string
  ): Promise<void> {
    const html = this.baseTemplate(
      'Reply to Your Message',
      `<h2>We've replied to your message</h2>
      <p>Hi ${name},</p>
      <p>Thank you for contacting us. Here's our response:</p>
      <div class="info-box">
        <p><strong>Your message:</strong></p>
        <p style="font-style: italic;">${originalMessage}</p>
      </div>
      <div class="info-box" style="background-color: #eef2ff;">
        <p><strong>Our reply:</strong></p>
        <p>${replyText}</p>
      </div>
      <p>If you have further questions, feel free to reply or <a href="${this.frontendUrl}/contact" style="color: #6366f1;">contact us again</a>.</p>`
    );
    await this.send(email, 'Reply to Your Message - CourseBit', html);
  }

  async sendPaymentFailed(email: string, name: string): Promise<void> {
    const html = this.baseTemplate(
      'Payment Failed',
      `<h2>Payment Failed</h2>
      <p>Hi ${name},</p>
      <p>We were unable to process your subscription payment. Please update your payment method to continue enjoying premium features.</p>
      <a href="${this.frontendUrl}/billing" class="btn">Update Payment Method</a>
      <p style="font-size: 13px; color: #9ca3af;">If your payment method isn't updated, your account may be downgraded to the free plan.</p>`
    );
    await this.send(email, 'Payment Failed - Action Required - CourseBit', html);
  }
}

export const emailService = new EmailService();
