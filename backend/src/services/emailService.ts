import nodemailer from 'nodemailer';

/**
 * Anything interpolated into an email body can come from a user (their name,
 * a course title, the text of a contact message). Templates are HTML, so it
 * has to be escaped or a name like `<img onerror=...>` ends up as live markup
 * in someone's inbox.
 */
const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/** Preserves the line breaks a person typed, after escaping. */
const escMultiline = (value: unknown): string => esc(value).replace(/\r?\n/g, '<br />');

/** Readable plain-text alternative — messages without one score as spam. */
const htmlToText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|li|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&middot;/g, '.')
    .replace(/&copy;/g, '(c)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  /** True when enough SMTP settings exist for a send to have any chance. */
  get isConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // Port 465 is implicit TLS. Hardcoding `false` meant every provider
        // on 465 — which is most of them — failed to connect.
        secure: process.env.SMTP_SECURE
          ? process.env.SMTP_SECURE === 'true'
          : port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  private get fromAddress(): string {
    return `"${process.env.SMTP_FROM_NAME || 'Coursbit'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;
  }

  /**
   * Email links must be absolute. Falling back to an empty string produced
   * hrefs like "/reset-password/abc", which are dead in every mail client and
   * made password reset impossible whenever FRONTEND_URL was unset.
   */
  private get frontendUrl(): string {
    const configured = process.env.FRONTEND_URL || process.env.PUBLIC_URL;
    if (configured) return configured.replace(/\/$/, '');
    return 'https://coursbit.com';
  }

  private baseTemplate(title: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
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
      <h1>Coursbit</h1>
      <p>AI-Powered Course Generator</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Coursbit. All rights reserved.</p>
      <p><a href="${this.frontendUrl}/terms" style="color: #6366f1;">Terms</a> &middot; <a href="${this.frontendUrl}/privacy" style="color: #6366f1;">Privacy</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    // Silence here used to mean a password reset simply never arrived and
    // nothing anywhere said why. Say it loudly instead.
    if (!this.isConfigured) {
      console.error(
        `Email NOT sent to ${to} ("${subject}") — SMTP is not configured. ` +
          'Set SMTP_HOST, SMTP_USER and SMTP_PASS.'
      );
      return false;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: htmlToText(html),
      });
      return true;
    } catch (error: any) {
      console.error(`Email send failed (${subject} -> ${to}):`, error.message);
      // Don't crash the request
      return false;
    }
  }

  /** Verifies SMTP credentials; used by the admin health check. */
  async verifyConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { ok: false, error: 'SMTP_HOST, SMTP_USER or SMTP_PASS is missing' };
    }
    try {
      await this.getTransporter().verify();
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || 'Connection failed' };
    }
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = this.baseTemplate(
      'Welcome to Coursbit',
      `<h2>Welcome, ${esc(name)}!</h2>
      <p>Thank you for joining Coursbit. You're now ready to create AI-powered courses in minutes.</p>
      <p>With Coursbit, you can:</p>
      <ul style="color: #4b5563; line-height: 2;">
        <li>Generate complete courses using AI (Gemini or GPT-4o)</li>
        <li>Create quizzes and earn certificates</li>
        <li>Export courses as PDF or PowerPoint</li>
        <li>Generate audio versions of your courses</li>
      </ul>
      <a href="${this.frontendUrl}/create" class="btn">Create Your First Course</a>
      <p>If you have any questions, feel free to <a href="${this.frontendUrl}/contact" style="color: #6366f1;">contact us</a>.</p>`
    );
    await this.send(email, 'Welcome to Coursbit!', html);
  }

  async sendForgotPassword(email: string, name: string, token: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password/${token}`;
    const html = this.baseTemplate(
      'Reset Your Password',
      `<h2>Password Reset Request</h2>
      <p>Hi ${esc(name)},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${resetLink}" class="btn">Reset Password</a>
      <p style="font-size: 13px; color: #9ca3af;">This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
      <p style="font-size: 12px; color: #9ca3af;">If the button doesn't work, copy and paste this link: ${resetLink}</p>`
    );
    await this.send(email, 'Reset Your Password - Coursbit', html);
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
      <p>Hi ${esc(name)},</p>
      <p>Your subscription has been activated successfully.</p>
      <div class="info-box">
        <p><strong>Plan:</strong> ${esc(plan.charAt(0).toUpperCase() + plan.slice(1))}</p>
        <p><strong>Amount:</strong> ${amount.toFixed(2)} ${esc(currency.toUpperCase())}</p>
        <p><strong>Next renewal:</strong> ${renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>You now have full access to all premium features including video courses, audio downloads, PPT exports, and unlimited course creation.</p>
      <a href="${this.frontendUrl}/dashboard" class="btn">Go to Dashboard</a>`
    );
    await this.send(email, 'Subscription Confirmed - Coursbit', html);
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
      <p>Hi ${esc(name)},</p>
      <p>We've processed your recurring payment.</p>
      <div class="info-box">
        <p><strong>Plan:</strong> ${esc(plan.charAt(0).toUpperCase() + plan.slice(1))}</p>
        <p><strong>Amount:</strong> ${amount.toFixed(2)} ${esc(currency.toUpperCase())}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      ${receiptUrl ? `<a href="${receiptUrl}" class="btn">View Receipt</a>` : ''}
      <p>Your premium access continues without interruption.</p>`
    );
    await this.send(email, 'Payment Received - Coursbit', html);
  }

  async sendSubscriptionCancelled(
    email: string,
    name: string,
    accessExpiresAt: Date
  ): Promise<void> {
    const html = this.baseTemplate(
      'Subscription Cancelled',
      `<h2>Subscription Cancelled</h2>
      <p>Hi ${esc(name)},</p>
      <p>Your subscription has been cancelled. You'll continue to have premium access until:</p>
      <div class="info-box">
        <p><strong>Access expires:</strong> ${accessExpiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>After this date, your account will revert to the free plan. Your courses and data will be preserved.</p>
      <p>Changed your mind? You can resubscribe anytime.</p>
      <a href="${this.frontendUrl}/billing" class="btn">Resubscribe</a>`
    );
    await this.send(email, 'Subscription Cancelled - Coursbit', html);
  }

  async sendSubscriptionModified(
    email: string,
    name: string,
    newPlan: string
  ): Promise<void> {
    const html = this.baseTemplate(
      'Subscription Updated',
      `<h2>Subscription Updated</h2>
      <p>Hi ${esc(name)},</p>
      <p>Your subscription has been updated.</p>
      <div class="info-box">
        <p><strong>New Plan:</strong> ${esc(newPlan.charAt(0).toUpperCase() + newPlan.slice(1))}</p>
      </div>
      <p>Your new plan benefits are now active.</p>
      <a href="${this.frontendUrl}/dashboard" class="btn">Go to Dashboard</a>`
    );
    await this.send(email, 'Subscription Updated - Coursbit', html);
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
      `<h2>Congratulations, ${esc(name)}!</h2>
      <p>You've earned a certificate of completion!</p>
      <div class="info-box">
        <p><strong>Course:</strong> ${esc(courseName)}</p>
        <p><strong>Completed:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <a href="${downloadLink}" class="btn">View & Download Certificate</a>
      <p>Share your achievement and keep learning!</p>`
    );
    await this.send(email, `Certificate Earned: ${courseName} - Coursbit`, html);
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
      <p>Hi ${esc(name)},</p>
      <p>Thank you for contacting us. Here's our response:</p>
      <div class="info-box">
        <p><strong>Your message:</strong></p>
        <p style="font-style: italic;">${escMultiline(originalMessage)}</p>
      </div>
      <div class="info-box" style="background-color: #eef2ff;">
        <p><strong>Our reply:</strong></p>
        <p>${escMultiline(replyText)}</p>
      </div>
      <p>If you have further questions, feel free to reply or <a href="${this.frontendUrl}/contact" style="color: #6366f1;">contact us again</a>.</p>`
    );
    await this.send(email, 'Reply to Your Message - Coursbit', html);
  }

  /** Tells the site owner someone used the contact form. */
  async sendContactNotification(
    name: string,
    email: string,
    message: string,
    messageId: string
  ): Promise<void> {
    const to = process.env.CONTACT_NOTIFY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    if (!to) {
      console.error('No CONTACT_NOTIFY_EMAIL configured — contact form notification skipped');
      return;
    }

    const html = this.baseTemplate(
      'New contact message',
      `<h2>New contact message</h2>
      <div class="info-box">
        <p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>
        <p><strong>Received:</strong> ${new Date().toLocaleString('en-GB')}</p>
      </div>
      <div class="info-box">
        <p>${escMultiline(message)}</p>
      </div>
      <a href="${this.frontendUrl}/admin/messages" class="btn">Open in admin</a>
      <p style="font-size: 12px; color: #9ca3af;">Message ID: ${esc(messageId)}</p>`
    );

    // Replying straight from the inbox should reach the sender, not us.
    if (!this.isConfigured) {
      console.error(`Contact notification NOT sent — SMTP is not configured (from ${email})`);
      return;
    }
    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        replyTo: email,
        subject: `New contact message from ${name}`,
        html,
        text: htmlToText(html),
      });
    } catch (error: any) {
      console.error('Contact notification failed:', error.message);
    }
  }

  async sendPaymentFailed(email: string, name: string): Promise<void> {
    const html = this.baseTemplate(
      'Payment Failed',
      `<h2>Payment Failed</h2>
      <p>Hi ${esc(name)},</p>
      <p>We were unable to process your subscription payment. Please update your payment method to continue enjoying premium features.</p>
      <a href="${this.frontendUrl}/billing" class="btn">Update Payment Method</a>
      <p style="font-size: 13px; color: #9ca3af;">If your payment method isn't updated, your account may be downgraded to the free plan.</p>`
    );
    await this.send(email, 'Payment Failed - Action Required - Coursbit', html);
  }
}

export const emailService = new EmailService();
