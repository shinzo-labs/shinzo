import * as yup from 'yup'
import axios from 'axios'
import { User, SubscriptionTier, OAuthAccount } from '../models'
import { logger } from '../logger'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'
import { handleGenerateIngestToken } from './ingestToken'
import * as crypto from 'crypto'

// OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback/google'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ''
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/callback/github'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Validation schemas
export const oauthCallbackSchema = yup.object({
  code: yup.string().required('Authorization code is required'),
  state: yup.string().optional(),
}).required()

// Helper functions
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

function generateEmailToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Google OAuth handlers
export const handleGoogleOAuthUrl = async (returnTo?: string) => {
  try {
    // Encode returnTo in state parameter if provided
    const stateData = {
      random: crypto.randomBytes(16).toString('hex'),
      returnTo: returnTo || ''
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return {
      response: {
        url: authUrl,
        state: state
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error generating Google OAuth URL', error })
    return {
      response: 'Error generating authorization URL',
      error: true,
      status: 500
    }
  }
}

export const handleGoogleOAuthCallback = async (request: yup.InferType<typeof oauthCallbackSchema>) => {
  try {
    // Decode state to extract returnTo if present
    let returnTo = ''
    if (request.state) {
      try {
        const stateData = JSON.parse(Buffer.from(request.state, 'base64').toString())
        returnTo = stateData.returnTo || ''
      } catch (e) {
        logger.warn({ message: 'Failed to decode state parameter', state: request.state })
      }
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code: request.code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })

    const { access_token } = tokenResponse.data

    // Fetch user profile
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    })

    const profile = profileResponse.data
    const email = profile.email
    const oauthId = profile.id

    // Get the free tier for new users
    const freeTier = await SubscriptionTier.findOne({ where: { tier: 'free' } })
    if (!freeTier) {
      logger.error({ message: 'Free subscription tier not found in database' })
      return {
        response: 'System configuration error',
        error: true,
        status: 500
      }
    }

    // Check if OAuth identity already exists in oauth_account table
    const existingOAuthAccount = await OAuthAccount.findOne({
      where: {
        oauth_provider: 'google',
        oauth_id: oauthId
      },
      include: [{ model: User, as: 'user' }]
    })

    let user: User

    if (existingOAuthAccount) {
      // OAuth account already linked - log them in
      user = (existingOAuthAccount as any).user
      logger.info({ message: 'User logged in via existing Google OAuth account', email, uuid: user.uuid })
    } else {
      // Check if email exists in user table (for linking to existing account)
      const existingUser = await User.findOne({ where: { email } })

      if (existingUser) {
        // Link new OAuth provider to existing account
        await OAuthAccount.create({
          user_uuid: existingUser.uuid,
          oauth_provider: 'google',
          oauth_id: oauthId,
          oauth_email: email,
          oauth_profile_data: profile,
        })

        // Ensure user is verified (OAuth emails are verified by provider)
        if (!existingUser.verified) {
          await existingUser.update({ verified: true })
        }

        user = existingUser
        logger.info({ message: 'Google OAuth linked to existing account', email, uuid: user.uuid })
      } else {
        // Create new user + OAuth account
        const emailToken = generateEmailToken()
        const emailTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        user = await User.create({
          email,
          password_hash: null,
          password_salt: null,
          email_token: emailToken,
          email_token_expiry: emailTokenExpiry,
          verified: true, // OAuth emails are verified by the provider
          subscription_tier_uuid: freeTier.uuid,
        })

        await OAuthAccount.create({
          user_uuid: user.uuid,
          oauth_provider: 'google',
          oauth_id: oauthId,
          oauth_email: email,
          oauth_profile_data: profile,
        })

        logger.info({ message: 'User created via Google OAuth', email, uuid: user.uuid })

        // Auto-generate ingest token for new users
        try {
          await handleGenerateIngestToken(user.uuid)
          logger.info({ message: 'Auto-generated ingest token for OAuth user', userUuid: user.uuid })
        } catch (tokenError) {
          logger.error({ message: 'Failed to auto-generate ingest token', error: tokenError, userUuid: user.uuid })
        }
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
        },
        returnTo
      },
      status: 200
    }

  } catch (error: any) {
    logger.error({
      message: 'Google OAuth callback error',
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    })
    return {
      response: error.response?.data?.error_description || error.message || 'OAuth authentication failed',
      error: true,
      status: 500
    }
  }
}

// GitHub OAuth handlers
export const handleGithubOAuthUrl = async (returnTo?: string) => {
  try {
    // Encode returnTo in state parameter if provided
    const stateData = {
      random: crypto.randomBytes(16).toString('hex'),
      returnTo: returnTo || ''
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'user:email',
      state: state,
    })

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

    return {
      response: {
        url: authUrl,
        state: state
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error generating GitHub OAuth URL', error })
    return {
      response: 'Error generating authorization URL',
      error: true,
      status: 500
    }
  }
}

export const handleGithubOAuthCallback = async (request: yup.InferType<typeof oauthCallbackSchema>) => {
  try {
    // Decode state to extract returnTo if present
    let returnTo = ''
    if (request.state) {
      try {
        const stateData = JSON.parse(Buffer.from(request.state, 'base64').toString())
        returnTo = stateData.returnTo || ''
      } catch (e) {
        logger.warn({ message: 'Failed to decode state parameter', state: request.state })
      }
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        code: request.code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_REDIRECT_URI,
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    )

    const { access_token } = tokenResponse.data

    // Fetch user profile
    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json'
      }
    })

    const profile = profileResponse.data

    // Fetch user emails (GitHub doesn't always include email in profile)
    const emailsResponse = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json'
      }
    })

    const emails = emailsResponse.data
    const primaryEmail = emails.find((e: any) => e.primary && e.verified)

    if (!primaryEmail) {
      return {
        response: 'No verified primary email found in GitHub account',
        error: true,
        status: 400
      }
    }

    const email = primaryEmail.email
    const oauthId = profile.id.toString()

    // Get the free tier for new users
    const freeTier = await SubscriptionTier.findOne({ where: { tier: 'free' } })
    if (!freeTier) {
      logger.error({ message: 'Free subscription tier not found in database' })
      return {
        response: 'System configuration error',
        error: true,
        status: 500
      }
    }

    // Check if OAuth identity already exists in oauth_account table
    const existingOAuthAccount = await OAuthAccount.findOne({
      where: {
        oauth_provider: 'github',
        oauth_id: oauthId
      },
      include: [{ model: User, as: 'user' }]
    })

    let user: User

    if (existingOAuthAccount) {
      // OAuth account already linked - log them in
      user = (existingOAuthAccount as any).user
      logger.info({ message: 'User logged in via existing GitHub OAuth account', email, uuid: user.uuid })
    } else {
      // Check if email exists in user table (for linking to existing account)
      const existingUser = await User.findOne({ where: { email } })

      if (existingUser) {
        // Link new OAuth provider to existing account
        await OAuthAccount.create({
          user_uuid: existingUser.uuid,
          oauth_provider: 'github',
          oauth_id: oauthId,
          oauth_email: email,
          oauth_profile_data: profile,
        })

        // Ensure user is verified (OAuth emails are verified by provider)
        if (!existingUser.verified) {
          await existingUser.update({ verified: true })
        }

        user = existingUser
        logger.info({ message: 'GitHub OAuth linked to existing account', email, uuid: user.uuid })
      } else {
        // Create new user + OAuth account
        const emailToken = generateEmailToken()
        const emailTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        user = await User.create({
          email,
          password_hash: null,
          password_salt: null,
          email_token: emailToken,
          email_token_expiry: emailTokenExpiry,
          verified: true, // OAuth emails are verified by the provider
          subscription_tier_uuid: freeTier.uuid,
        })

        await OAuthAccount.create({
          user_uuid: user.uuid,
          oauth_provider: 'github',
          oauth_id: oauthId,
          oauth_email: email,
          oauth_profile_data: profile,
        })

        logger.info({ message: 'User created via GitHub OAuth', email, uuid: user.uuid })

        // Auto-generate ingest token for new users
        try {
          await handleGenerateIngestToken(user.uuid)
          logger.info({ message: 'Auto-generated ingest token for OAuth user', userUuid: user.uuid })
        } catch (tokenError) {
          logger.error({ message: 'Failed to auto-generate ingest token', error: tokenError, userUuid: user.uuid })
        }
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
        },
        returnTo
      },
      status: 200
    }

  } catch (error: any) {
    logger.error({
      message: 'GitHub OAuth callback error',
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    })
    return {
      response: error.response?.data?.error_description || error.message || 'OAuth authentication failed',
      error: true,
      status: 500
    }
  }
}
