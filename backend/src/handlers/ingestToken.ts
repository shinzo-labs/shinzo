import * as yup from 'yup'
import { IngestToken } from '../models/open_telemetry/IngestToken'
import { User } from '../models/main/User'
import { logger } from '../logger'
import * as crypto from 'crypto'

function generateIngestToken(): string {
  // Generate a secure 32-character alphanumeric token
  return crypto.randomBytes(16).toString('hex')
}

export const handleGenerateIngestToken = async (userUuid: string) => {
  try {
    logger.info({ message: 'Starting ingest token generation', userUuid })

    // Verify user exists
    const user = await User.findByPk(userUuid)
    if (!user) {
      logger.error({ message: 'User not found for ingest token generation', userUuid })
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }
    logger.info({ message: 'User found', userUuid, userEmail: user.email })

    // Note: We no longer automatically deprecate existing tokens when creating new ones
    // Users can manually revoke tokens if they want to

    // Generate new token
    const newTokenValue = generateIngestToken()
    logger.info({ message: 'Generated new token value', userUuid, tokenLength: newTokenValue.length })

    const newToken = await IngestToken.create({
      user_uuid: userUuid,
      ingest_token: newTokenValue,
      status: 'live',
    })

    logger.info({ message: 'Ingest token generated successfully', userUuid, tokenUuid: newToken.uuid })

    return {
      response: {
        message: 'Ingest token generated successfully',
        token: newToken.ingest_token,
        uuid: newToken.uuid,
        status: newToken.status,
        created_at: newToken.created_at
      },
      status: 201
    }

  } catch (error: any) {
    logger.error({ message: 'Error generating ingest token', error: error.message, stack: error.stack, userUuid })
    return {
      response: 'Error generating ingest token',
      error: true,
      status: 500
    }
  }
}

export const handleFetchIngestTokens = async (userUuid: string) => {
  try {
    const tokens = await IngestToken.findAll({
      where: { user_uuid: userUuid },
      order: [['created_at', 'DESC']],
      attributes: ['uuid', 'ingest_token', 'status', 'created_at', 'updated_at']
    })

    return {
      response: {
        tokens: tokens.map(token => ({
          uuid: token.uuid,
          ingest_token: token.ingest_token,
          status: token.status,
          created_at: token.created_at,
          updated_at: token.updated_at
        }))
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching ingest tokens', error, userUuid })
    return {
      response: 'Error fetching ingest tokens',
      error: true,
      status: 500
    }
  }
}

export const handleRevokeIngestToken = async (userUuid: string, tokenUuid: string) => {
  try {
    const token = await IngestToken.findOne({
      where: {
        uuid: tokenUuid,
        user_uuid: userUuid
      }
    })

    if (!token) {
      return {
        response: 'Token not found',
        error: true,
        status: 404
      }
    }

    await token.update({ status: 'deprecated' })

    logger.info({ message: 'Ingest token revoked successfully', userUuid, tokenUuid })

    return {
      response: {
        message: 'Ingest token revoked successfully',
        uuid: token.uuid,
        status: token.status
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error revoking ingest token', error, userUuid, tokenUuid })
    return {
      response: 'Error revoking ingest token',
      error: true,
      status: 500
    }
  }
}