import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../handlers/auth'
import { sequelize } from '../dbClient'
import { logger } from '../logger'
import { decryptProviderKey } from '../utils'

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    uuid: string
    email: string
    verified: boolean
  }
}

export interface ShinzoCredentials {
  apiKey: string
  apiKeyUuid: string
  apiKeyHeader: 'x-shinzo-api-key' | 'authorization'
  userUuid: string
}

export interface ProviderCredentials {
  providerKey?: string
  providerKeyUuid?: string
}

export const authenticateJWT = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<boolean> => {
  try {
    const authorization = request.headers.authorization

    if (!authorization) {
      reply.status(401).send({ error: 'Missing authorization header' })
      return false
    }

    const token = authorization.replace('Bearer ', '')
    const decoded = verifyJWT(token)

    if (!decoded) {
      reply.status(401).send({ error: 'Invalid or expired token' })
      return false
    }

    request.user = decoded
    return true

  } catch (error) {
    logger.error({ message: 'Authentication error', error })
    reply.status(401).send({ error: 'Authentication failed' })
    return false
  }
}

export const authenticatedShinzoCredentials = async (request: FastifyRequest): Promise<ShinzoCredentials> => {
  const result: ShinzoCredentials = {
    apiKey: '',
    apiKeyUuid: '',
    apiKeyHeader: 'x-shinzo-api-key',
    userUuid: '',
  }

  try {
    const xShinzoApiKeyHeader = request.headers['x-shinzo-api-key']

    const apiKeyHeader = (typeof xShinzoApiKeyHeader === 'string' && xShinzoApiKeyHeader)
     ? 'x-shinzo-api-key'
     : 'authorization'

    const apiKey = request.headers[apiKeyHeader]
    delete request.headers[apiKeyHeader]

    if (!apiKey || typeof apiKey !== 'string') {
      return result
    }

    const [shinzoKeyResults] = await sequelize.query(
      `SELECT uuid, user_uuid, key_name, status
       FROM spotlight.shinzo_api_key
       WHERE api_key = $1 AND status = 'active'`,
      { bind: [apiKey] })

    if (!shinzoKeyResults?.length) {
      return result
    }

    const shinzoKey = shinzoKeyResults[0] as any

    await sequelize.query(
      `UPDATE spotlight.shinzo_api_key SET last_used = CURRENT_TIMESTAMP WHERE uuid = $1`,
      { bind: [shinzoKey.uuid] }
    )

    result.apiKeyUuid = shinzoKey.uuid
    result.apiKey = apiKey
    result.apiKeyHeader = apiKeyHeader
    result.userUuid = shinzoKey.user_uuid
    return result
  } catch (error) {
    logger.error({ message: 'Shinzo API key authentication error', error })
    return result
  }
}

export const getProviderCredentials = async (request: FastifyRequest, provider: string, shinzoCredentials: ShinzoCredentials): Promise<ProviderCredentials> => {
  const result: ProviderCredentials = {
    providerKey: undefined,
    providerKeyUuid: undefined,
  }

  try {
    const providerAuthToken = shinzoCredentials.apiKeyHeader !== 'authorization'
      ? request.headers.authorization?.replace('Bearer ', '')
      : undefined
    const providerApiKey = typeof request.headers['x-api-key'] === 'string'
      ? request.headers['x-api-key']
      : undefined
    result.providerKey = providerAuthToken || providerApiKey

    if (!result.providerKey) {
      const [providerKeyResults] = await sequelize.query(
        `SELECT uuid, encrypted_key, encryption_iv, provider_base_url, provider
          FROM spotlight.provider_key
          WHERE user_uuid = $1 AND provider = $2 AND status = 'active'
          LIMIT 1`,
        { bind: [shinzoCredentials.userUuid, provider] }
      )

      if (!providerKeyResults?.length) return result

      const providerKeyRow = providerKeyResults[0] as any

      try {
        result.providerKey = decryptProviderKey(providerKeyRow.encrypted_key, providerKeyRow.encryption_iv)
      } catch (decryptError) {
        logger.error({
          message: 'Failed to decrypt provider key',
          error: decryptError,
          userUuid: shinzoCredentials.userUuid
        })
        return result
      }

      await sequelize.query(
        `UPDATE spotlight.provider_key SET last_used = CURRENT_TIMESTAMP WHERE uuid = $1`,
        { bind: [providerKeyRow.uuid] }
      )

      result.providerKeyUuid = providerKeyRow.uuid

      request.headers.authorization = `Bearer ${result.providerKey}` // TODO confirm that this works for both API and subscription-based access
    }

    return result
  } catch (error) {
    logger.error({ message: 'Failed to get provider credentials', error })
    return result
  }
}
