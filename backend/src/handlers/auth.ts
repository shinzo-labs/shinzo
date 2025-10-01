import * as yup from 'yup'
import { User, SubscriptionTier } from '../models'
import { logger } from '../logger'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { emailService } from '../services/emailService'
import { handleGenerateIngestToken } from './ingestToken'

export const createUserSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
}).required()

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().required('Password is required'),
}).required()

export const verifyUserSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  verification_token: yup.string().required('Verification token is required'),
}).required()

export const resendVerificationSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
}).required()

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

function generateEmailToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function generateJWT(user: User): string {
  return jwt.sign(
    {
      uuid: user.uuid,
      email: user.email,
      verified: user.verified
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export const handleCreateUser = async (request: yup.InferType<typeof createUserSchema>) => {
  try {
    const existingUser = await User.findOne({ where: { email: request.email } })

    if (existingUser) {
      return {
        response: 'Email already exists',
        error: true,
        status: 409
      }
    }

    const salt = generateSalt()
    const passwordHash = hashPassword(request.password, salt)
    const emailToken = generateEmailToken()
    const emailTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const user = await User.create({
      email: request.email,
      password_hash: passwordHash,
      password_salt: salt,
      email_token: emailToken,
      email_token_expiry: emailTokenExpiry,
      verified: false,
    })

    logger.info({ message: 'User created successfully', email: request.email, uuid: user.uuid })

    // Send verification email
    try {
      await emailService.sendVerificationEmail({
        email: user.email,
        verification_token: emailToken,
        user_uuid: user.uuid
      })
    } catch (emailError) {
      logger.error({ message: 'Failed to send verification email', error: emailError, user_uuid: user.uuid })
      // Continue with user creation even if email fails
    }

    return {
      response: {
        message: 'User account created successfully, verification email sent',
        uuid: user.uuid,
        email: user.email
      },
      status: 201
    }

  } catch (error) {
    logger.error({ message: 'Error creating user', error })
    return {
      response: 'Error creating user account',
      error: true,
      status: 500
    }
  }
}

export const handleLogin = async (request: yup.InferType<typeof loginSchema>) => {
  try {
    const user = await User.findOne({ where: { email: request.email } })

    if (!user) {
      return {
        response: 'Invalid credentials',
        error: true,
        status: 401
      }
    }

    const passwordHash = hashPassword(request.password, user.password_salt)

    if (passwordHash !== user.password_hash) {
      return {
        response: 'Invalid credentials',
        error: true,
        status: 401
      }
    }

    // Check if user has verified their email
    if (!user.verified) {
      return {
        response: 'Please verify your email address before logging in',
        error: true,
        status: 403
      }
    }

    const token = generateJWT(user)

    return {
      response: {
        token,
        user: {
          uuid: user.uuid,
          email: user.email,
          verified: user.verified
        }
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Login error', error })
    return {
      response: 'Error processing login',
      error: true,
      status: 500
    }
  }
}

export const handleVerifyUser = async (request: yup.InferType<typeof verifyUserSchema>) => {
  try {
    const user = await User.findOne({ where: { email: request.email } })

    if (!user) {
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }

    if (user.verified) {
      return {
        response: 'Email already verified',
        error: true,
        status: 409
      }
    }

    if (user.email_token !== request.verification_token) {
      return {
        response: 'Invalid verification token',
        error: true,
        status: 400
      }
    }

    if (new Date() > user.email_token_expiry) {
      return {
        response: 'Verification token has expired',
        error: true,
        status: 400
      }
    }

    await user.update({
      verified: true,
      email_token: generateEmailToken(), // Generate new token for security
      email_token_expiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    })

    // Auto-generate ingest token for newly verified users
    try {
      await handleGenerateIngestToken(user.uuid)
      logger.info({ message: 'Auto-generated ingest token for verified user', userUuid: user.uuid })
    } catch (tokenError) {
      logger.error({ message: 'Failed to auto-generate ingest token', error: tokenError, userUuid: user.uuid })
      // Continue with verification even if token generation fails
    }

    return {
      response: {
        message: 'Email verified successfully',
        verified: true
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Email verification error', error })
    return {
      response: 'Error verifying email',
      error: true,
      status: 500
    }
  }
}

export const handleFetchUser = async (userUuid: string) => {
  try {
    const user = await User.findByPk(userUuid)

    if (!user) {
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }

    return {
      response: {
        uuid: user.uuid,
        email: user.email,
        verified: user.verified,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching user', error })
    return {
      response: 'Error fetching user profile',
      error: true,
      status: 500
    }
  }
}

export const handleResendVerification = async (request: yup.InferType<typeof resendVerificationSchema>) => {
  try {
    const user = await User.findOne({ where: { email: request.email } })

    if (!user) {
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }

    if (user.verified) {
      return {
        response: 'Email is already verified',
        error: true,
        status: 400
      }
    }

    // Generate new verification token
    const emailToken = generateEmailToken()
    const emailTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await user.update({
      email_token: emailToken,
      email_token_expiry: emailTokenExpiry
    })

    // Send verification email
    try {
      await emailService.sendVerificationEmail({
        email: user.email,
        verification_token: emailToken,
        user_uuid: user.uuid
      })
    } catch (emailError) {
      logger.error({ message: 'Failed to resend verification email', error: emailError, user_uuid: user.uuid })
      return {
        response: 'Failed to send verification email',
        error: true,
        status: 500
      }
    }

    logger.info({ message: 'Verification email resent successfully', email: request.email, uuid: user.uuid })

    return {
      response: {
        message: 'Verification email sent successfully'
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error resending verification email', error })
    return {
      response: 'Error resending verification email',
      error: true,
      status: 500
    }
  }
}

export const verifyJWT = (token: string): { uuid: string; email: string; verified: boolean } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    logger.error({ message: 'JWT verification failed', error })
    return null
  }
}

export const handleFetchUserQuota = async (userUuid: string) => {
  try {
    const user = await User.findOne({
      where: { uuid: userUuid },
      include: [{
        model: SubscriptionTier,
        as: 'subscriptionTier'
      }]
    })

    if (!user) {
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }

    const now = new Date()
    const lastReset = new Date(user.last_counter_reset)
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // Check if we need to reset the counter (if more than 1 month has passed)
    let currentCounter = user.monthly_counter
    if (lastReset <= oneMonthAgo) {
      await user.update({
        monthly_counter: 0,
        last_counter_reset: now
      })
      currentCounter = 0
    }

    const subscriptionTier = (user as any).subscriptionTier

    return {
      response: {
        currentUsage: currentCounter,
        monthlyQuota: subscriptionTier?.monthly_quota,
        tier: subscriptionTier?.tier,
        lastCounterReset: user.last_counter_reset,
        subscribedOn: user.subscribed_on
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching user quota', error })
    return {
      response: 'Error fetching user quota',
      error: true,
      status: 500
    }
  }
}