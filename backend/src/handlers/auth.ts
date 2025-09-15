import * as yup from 'yup'
import { User } from '../models'
import { logger } from '../logger'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

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
    const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const user = await User.create({
      email: request.email,
      password_hash: passwordHash,
      password_salt: salt,
      email_token: emailToken,
      email_token_expiry: emailTokenExpiry,
      verified: false,
    })

    logger.info({ message: 'User created successfully', email: request.email, uuid: user.uuid })

    return {
      response: {
        message: 'User account created successfully, verification email sent',
        uuid: user.uuid,
        email: user.email,
        verification_token: emailToken // In production, this would be sent via email
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
      email_token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })

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

export const verifyJWT = (token: string): { uuid: string; email: string; verified: boolean } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    logger.error({ message: 'JWT verification failed', error })
    return null
  }
}