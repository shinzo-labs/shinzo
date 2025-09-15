import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyJWT } from '../handlers/auth'
import { verifyIngestToken } from '../handlers/ingest'
import { logger } from '../logger'

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    uuid: string
    email: string
    verified: boolean
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

export const authenticateIngestToken = async (request: FastifyRequest): Promise<string | null> => {
  try {
    const ingestTokenHeader = request.headers['ingest-token'] as string

    if (!ingestTokenHeader) {
      return null
    }

    const ingestToken = await verifyIngestToken(ingestTokenHeader)

    if (!ingestToken) {
      return null
    }

    return ingestToken.user_uuid

  } catch (error) {
    logger.error({ message: 'Ingest token authentication error', error })
    return null
  }
}