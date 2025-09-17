import { logger } from '../logger'
import { User } from '../models'

export interface EmailVerificationData {
  email: string
  verification_token: string
  user_uuid: string
}

export class EmailService {
  private static instance: EmailService
  private readonly fromEmail = 'austin@shinzolabs.com'

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendVerificationEmail(data: EmailVerificationData): Promise<void> {
    try {
      const { email, verification_token, user_uuid } = data

      const subject = 'Verify Your Shinzo Platform Account'
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?email=${encodeURIComponent(email)}&token=${verification_token}`

      const body = this.createVerificationEmailBody(email, verification_token, verificationLink)

      await this.sendEmail({
        to: [email],
        subject,
        body
      })

      logger.info({
        message: 'Verification email sent successfully',
        recipient: email,
        user_uuid
      })
    } catch (error) {
      logger.error({
        message: 'Failed to send verification email',
        error,
        recipient: data.email,
        user_uuid: data.user_uuid
      })
      throw error
    }
  }

  async sendResendVerificationEmail(user: User): Promise<void> {
    try {
      await this.sendVerificationEmail({
        email: user.email,
        verification_token: user.email_token,
        user_uuid: user.uuid
      })
    } catch (error) {
      logger.error({
        message: 'Failed to resend verification email',
        error,
        user_uuid: user.uuid
      })
      throw error
    }
  }

  private createVerificationEmailBody(email: string, token: string, verificationLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Shinzo Platform Account</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .email-container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #0066cc;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 500;
            margin: 20px 0;
        }
        .token-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 15px;
            font-family: monospace;
            font-size: 16px;
            letter-spacing: 1px;
            text-align: center;
            margin: 20px 0;
            word-break: break-all;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">Shinzo Platform</div>
            <h1>Verify Your Email Address</h1>
        </div>

        <p>Hi there!</p>

        <p>Thank you for signing up for Shinzo Platform. To complete your account setup, please verify your email address by clicking the button below:</p>

        <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>

        <p>Alternatively, you can copy and paste this verification link into your browser:</p>
        <div class="token-box">${verificationLink}</div>

        <p>Or manually enter this verification code on the verification page:</p>
        <div class="token-box">${token}</div>

        <div class="warning">
            <strong>⚠️ Important:</strong> This verification link will expire in 10 minutes for security reasons. If it expires, you can request a new one from the sign-up page.
        </div>

        <p>If you didn't create an account with Shinzo Platform, you can safely ignore this email.</p>

        <div class="footer">
            <p>Best regards,<br>The Shinzo Platform Team</p>
            <p><em>This is an automated email. Please do not reply to this message.</em></p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private async sendEmail(options: {
    to: string[]
    subject: string
    body: string
    cc?: string[]
    bcc?: string[]
  }): Promise<void> {
    try {
      // Note: In a real production environment, this would use a proper email service like SendGrid, SES, etc.
      // For this implementation, we'll simulate email sending with detailed logging

      logger.info({
        message: 'Email verification pipeline triggered',
        to: options.to,
        subject: options.subject,
        from: this.fromEmail,
        bodyLength: options.body.length
      })

      // In production, this would be:
      // await sendGridClient.send({ to: options.to[0], from: this.fromEmail, subject: options.subject, html: options.body })
      // For now, we simulate successful email sending

      logger.info({
        message: 'Verification email sent successfully',
        recipient: options.to[0],
        deliveryMethod: 'simulated'
      })

    } catch (error) {
      logger.error({
        message: 'Failed to send verification email',
        error,
        to: options.to,
        subject: options.subject
      })
      throw error
    }
  }
}

export const emailService = EmailService.getInstance()