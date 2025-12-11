import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../handlers/auth'
import { sequelize } from '../dbClient'
import { logger } from '../logger'
import { decryptProviderKey } from '../utils'

const X_SHINZO_API_KEY = 'x-shinzo-api-key'
const X_API_KEY = 'x-api-key'
const AUTHORIZATION = 'authorization'
const SHINZO_KEY_PREFIX = 'sk_shinzo'
const ANTHROPIC_OAUTH_KEY_PREFIX = 'sk-ant-oat'

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
  apiKeyHeader?: typeof X_SHINZO_API_KEY | typeof X_API_KEY | typeof AUTHORIZATION
  userUuid: string
}

export interface ProviderCredentials {
  providerKey: string | null
  providerKeyUuid: string | null
}

const requestContainsHeader = (request: FastifyRequest, header: string, prefix?: string): boolean => {
    let value = request.headers[header]
    if (typeof value !== 'string' || !value) return false
    if (!prefix) return true
    if (header === AUTHORIZATION) value = value?.replace('Bearer ', '')
    return value.startsWith(prefix)
  }

export const constructModelAPIHeaders = (requestHeaders: Record<string, string | string[] | undefined>) => {
  const headers: Record<string, string> = {}

  const skipHeaders = new Set([
    'host',           // Don't forward the proxy host to the provider (causes SSL issues)
    'connection',     // Connection-specific headers
    'content-length', // Let axios calculate this
    X_SHINZO_API_KEY, // Shinzo-specific header
  ])

  for (const [key, value] of Object.entries(requestHeaders)) {
    const lowerKey = key.toLowerCase()

    if (skipHeaders.has(lowerKey)) continue

    if (value !== undefined) headers[key] = Array.isArray(value) ? value.join(', ') : value
  }

  return headers
}

export const constructModelAPIResponseHeaders = (result: any, reply: FastifyReply) => {
  if (result.responseHeaders) {
    for (const [key, value] of Object.entries(result.responseHeaders)) {
      if (value !== undefined && key.toLowerCase() !== 'transfer-encoding') {
        reply.header(key, value)
      }
    }
  }
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
  let result: ShinzoCredentials = {
    apiKey: '',
    apiKeyUuid: '',
    apiKeyHeader: undefined,
    userUuid: '',
  }

  try {
    let apiKeyHeader: typeof X_SHINZO_API_KEY | typeof X_API_KEY | typeof AUTHORIZATION | undefined

    if (requestContainsHeader(request, X_SHINZO_API_KEY, SHINZO_KEY_PREFIX)) {
      apiKeyHeader = X_SHINZO_API_KEY
    } else if (requestContainsHeader(request, X_API_KEY, SHINZO_KEY_PREFIX)) {
      apiKeyHeader = X_API_KEY
    } else if (requestContainsHeader(request, AUTHORIZATION, SHINZO_KEY_PREFIX)) {
      apiKeyHeader = AUTHORIZATION
    } else {
      return result
    }

    let apiKey = request.headers[apiKeyHeader]
    if (!(apiKey && typeof apiKey === 'string')) return result

    apiKey = apiKey.replace('Bearer ', '')

    delete request.headers[apiKeyHeader]

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

    result = {
      apiKeyUuid: shinzoKey.uuid,
      apiKey: apiKey,
      apiKeyHeader: apiKeyHeader,
      userUuid: shinzoKey.user_uuid
    }

    return result
  } catch (error) {
    logger.error({ message: 'Shinzo API key authentication error', error })
    return result
  }
}

export const getProviderCredentials = async (request: FastifyRequest, provider: string, shinzoCredentials: ShinzoCredentials): Promise<ProviderCredentials> => {
  const result: ProviderCredentials = { providerKey: null, providerKeyUuid: null }

  // Note: all of this logic only works for provider: anthropic at the moment. Other providers TBD.

  try {
    if (requestContainsHeader(request, AUTHORIZATION)) {
      result.providerKey = request.headers.authorization?.replace('Bearer ', '') as string
    } else if (requestContainsHeader(request, X_API_KEY)) {
      result.providerKey = request.headers[X_API_KEY] as string
    }

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

      if (result.providerKey.startsWith(ANTHROPIC_OAUTH_KEY_PREFIX)) { // Subscription OAuth keys use Authorization header
        request.headers.authorization = `Bearer ${result.providerKey}`
      } else { // API keys use x-api-key header
        request.headers[X_API_KEY] = result.providerKey
      }
    }

    return result
  } catch (error) {
    logger.error({ message: 'Failed to get provider credentials', error })
    return result
  }
}
