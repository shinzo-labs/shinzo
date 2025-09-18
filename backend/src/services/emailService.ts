import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import { logger } from '../logger'
import { User } from '../models'
import {
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
  FROM_EMAIL,
  FROM_NAME,
  FRONTEND_URL
} from '../config'

export interface EmailVerificationData {
  email: string
  verification_token: string
  user_uuid: string
}

export class EmailService {
  private static instance: EmailService
  private mailgun: any

  private constructor() {
    this.mailgun = this.createMailgunClient()
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  private createMailgunClient() {
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      logger.warn('Mailgun credentials not configured - emails will be logged only')
      return null
    }

    const mailgun = new Mailgun(FormData)
    return mailgun.client({
      username: 'api',
      key: MAILGUN_API_KEY
    })
  }

  async sendVerificationEmail(data: EmailVerificationData): Promise<void> {
    try {
      const { email, verification_token, user_uuid } = data

      const subject = 'Verify Your Shinzo Platform Account'
      const verificationLink = `${FRONTEND_URL}/verify?email=${encodeURIComponent(email)}&token=${verification_token}`

      const body = this.createVerificationEmailBody(email, verification_token, verificationLink)

      await this.sendEmail({
        to: email,
        subject,
        html: body
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
    <title>Verify Your Email Address</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 40px 40px 20px;
            background: linear-gradient(90deg, rgb(194, 229, 255) 0%, rgb(153, 255, 248) 50%, rgb(92, 122, 255) 100%);
            color: rgb(20, 20, 20);
        }
        .logo-text {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
        }
        .header-title {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            opacity: 0.95;
        }
        .content {
            padding: 40px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #555;
        }
        .main-text {
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.6;
            color: #444;
        }
        .verification-section {
            text-align: center;
            margin: 30px 0;
        }
        .verification-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .verification-code {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 3px;
            color: #495057;
            margin: 0 auto 20px;
            max-width: 300px;
            word-break: break-all;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(90deg, rgb(194, 229, 255) 0%, rgb(153, 255, 248) 50%, rgb(92, 122, 255) 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(92, 122, 255, 0.3);
        }
        .button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(92, 122, 255, 0.4);
        }
        .alternative-text {
            font-size: 14px;
            color: #666;
            margin: 25px 0 15px 0;
            text-align: center;
        }
        .url-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
            color: #495057;
            word-break: break-all;
            margin: 15px 0;
        }
        .expiry-notice {
            background: rgb(194, 229, 255, 0.3);
            border-left: 4px solid rgb(92, 122, 255);
            border-radius: 4px;
            padding: 16px;
            margin: 25px 0;
            font-size: 14px;
            color: rgb(60, 90, 200);
        }
        .expiry-notice strong {
            color: rgb(28, 135, 87);
        }
        .footer {
            background: rgb(239, 247, 246);
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid rgb(194, 229, 255, 0.5);
            color: rgb(20, 20, 20, 0.7);
            font-size: 14px;
        }
        .footer p {
            margin: 8px 0;
        }
        .signature {
            margin: 20px 0 10px 0;
            font-weight: 500;
            color: rgb(28, 135, 87);
        }
        .disclaimer {
            font-style: italic;
            opacity: 0.8;
        }
        @media (max-width: 600px) {
            .email-container {
                margin: 20px;
                border-radius: 4px;
            }
            .header {
                padding: 30px 20px 15px;
            }
            .content {
                padding: 30px 20px;
            }
            .footer {
                padding: 20px;
            }
            .verification-code {
                font-size: 20px;
                letter-spacing: 2px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="logo-text">Shinzo Platform</h1>
            <p class="header-title">Verify Your Email Address</p>
        </div>

        <div class="content">
            <p class="greeting">Hi there!</p>

            <p class="main-text">Thank you for signing up for Shinzo Platform. To complete your account setup, please verify your email address by clicking the button below:</p>

            <div class="verification-section">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>

            <p class="alternative-text">Alternatively, you can copy and paste this verification link into your browser:</p>
            <div class="url-box">${verificationLink}</div>

            <p class="alternative-text">Or manually enter this verification code on the verification page:</p>

            <div class="verification-section">
                <div class="verification-label">Your verification code is:</div>
                <div class="verification-code">${token}</div>
            </div>

            <div class="expiry-notice">
                <strong>Important:</strong> This verification link will expire in 10 minutes for security reasons. If it expires, you can request a new one from the sign-up page.
            </div>

            <p>If you didn't create an account with Shinzo Platform, you can safely ignore this email.</p>
        </div>

        <div class="footer">
            <p class="signature">Best regards,<br>The Shinzo Platform Team</p>
            <p class="disclaimer">This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  private async sendEmail(options: {
    to: string
    subject: string
    html: string
    cc?: string
    bcc?: string
  }): Promise<void> {
    try {
      if (!this.mailgun) {
        logger.warn({
          message: 'Mailgun not configured - email not sent',
          to: options.to,
          subject: options.subject
        })
        return
      }

      logger.info({
        message: 'Sending email via Mailgun',
        to: options.to,
        subject: options.subject,
        from: FROM_EMAIL
      })

      const mailData = {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.cc && { cc: options.cc }),
        ...(options.bcc && { bcc: options.bcc })
      }

      const result = await this.mailgun.messages.create(MAILGUN_DOMAIN, mailData)

      logger.info({
        message: 'Email sent successfully via Mailgun',
        recipient: options.to,
        messageId: result.id
      })

    } catch (error) {
      logger.error({
        message: 'Failed to send email via Mailgun',
        error,
        to: options.to,
        subject: options.subject
      })
      throw error
    }
  }
}

export const emailService = EmailService.getInstance()