import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import { PORT, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, MAX_PAYLOAD_SIZE } from './config'
import { logger, pinoConfig } from './logger'
import { sequelize } from './dbClient'
import { authenticateJWT, AuthenticatedRequest } from './middleware/auth'

// Import handlers
import {
  handleCreateUser,
  createUserSchema,
  handleLogin,
  loginSchema,
  handleVerifyUser,
  verifyUserSchema,
  handleResendVerification,
  resendVerificationSchema,
  handleFetchUser
} from './handlers/auth'

import {
  handleFetchResources,
  handleFetchTraces,
  handleFetchSpans,
  handleFetchMetrics,
  fetchDataSchema
} from './handlers/telemetry'

import {
  handleIngestHTTP,
  verifyIngestToken
} from './handlers/ingest'

import {
  handleGenerateIngestToken,
  handleFetchIngestTokens,
  handleRevokeIngestToken
} from './handlers/ingestToken'

// Create Fastify instance
const app = fastify({
  logger: pinoConfig('backend'),
  bodyLimit: parseInt(MAX_PAYLOAD_SIZE.replace('mb', '')) * 1024 * 1024,
})

// Register plugins
app.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
})

app.register(fastifyRateLimit, {
  max: RATE_LIMIT_MAX,
  timeWindow: RATE_LIMIT_WINDOW
})

// Health check endpoint
app.get('/health', async (request, reply) => {
  try {
    await sequelize.authenticate()
    reply.send({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (error) {
    reply.status(503).send({ status: 'error', message: 'Database connection failed' })
  }
})

// Authentication endpoints
app.post('/auth/create_user', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await createUserSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleCreateUser(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Create user error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await loginSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleLogin(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Login error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.post('/auth/verify_user', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await verifyUserSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleVerifyUser(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Verify user error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.post('/auth/resend_verification', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await resendVerificationSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleResendVerification(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Resend verification error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/auth/fetch_user', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleFetchUser(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch user error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// Ingest token management endpoints
app.post('/auth/generate_ingest_token', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    logger.info({ message: 'Generate ingest token request', user: request.user })
    const result = await handleGenerateIngestToken(request.user!.uuid)
    logger.info({ message: 'Generate ingest token result', status: result.status, hasError: !!result.error })
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Generate ingest token error', error: error.message, stack: error.stack })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.get('/auth/fetch_ingest_tokens', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleFetchIngestTokens(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch ingest tokens error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.post('/auth/revoke_ingest_token/:tokenUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { tokenUuid } = request.params as { tokenUuid: string }
    const result = await handleRevokeIngestToken(request.user!.uuid, tokenUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Revoke ingest token error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// Telemetry data retrieval endpoints
app.get('/telemetry/fetch_resources', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleFetchResources(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch resources error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.get('/telemetry/fetch_traces', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedQuery = await fetchDataSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleFetchTraces(request.user!.uuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch traces error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/telemetry/fetch_spans', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedQuery = await fetchDataSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleFetchSpans(request.user!.uuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch spans error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/telemetry/fetch_metrics', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedQuery = await fetchDataSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleFetchMetrics(request.user!.uuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch metrics error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

// Telemetry ingestion endpoints
app.post('/telemetry/ingest_http', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const ingestTokenHeader = request.headers['authorization'] as string

    if (!ingestTokenHeader) {
      reply.status(401).send({ error: 'Missing Authorization header' })
      return
    }

    const ingestToken = await verifyIngestToken(ingestTokenHeader)

    if (!ingestToken) {
      reply.status(401).send({ error: 'Invalid or inactive Authorization token' })
      return
    }

    const result = await handleIngestHTTP(ingestToken, request.body as any)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Ingest HTTP error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// OpenTelemetry specification compliant endpoints
app.post('/telemetry/ingest_http/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const ingestTokenHeader = request.headers['authorization'] as string

    if (!ingestTokenHeader) {
      reply.status(401).send({ error: 'Missing Authorization header' })
      return
    }

    const ingestToken = await verifyIngestToken(ingestTokenHeader)

    if (!ingestToken) {
      reply.status(401).send({ error: 'Invalid or inactive Authorization token' })
      return
    }

    const result = await handleIngestHTTP(ingestToken, request.body as any)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Ingest HTTP metrics error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.post('/telemetry/ingest_http/traces', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const ingestTokenHeader = request.headers['authorization'] as string

    if (!ingestTokenHeader) {
      reply.status(401).send({ error: 'Missing Authorization header' })
      return
    }

    const ingestToken = await verifyIngestToken(ingestTokenHeader)

    if (!ingestToken) {
      reply.status(401).send({ error: 'Invalid or inactive Authorization token' })
      return
    }

    const result = await handleIngestHTTP(ingestToken, request.body as any)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Ingest HTTP traces error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// Error handler
app.setErrorHandler((error, request, reply) => {
  logger.error({ message: 'Unhandled error', error, url: request.url })
  reply.status(500).send({ error: 'Internal server error' })
})

// Start server
const start = async () => {
  try {
    // Test database connection
    await sequelize.authenticate()
    logger.info('Database connection established successfully')

    // Start server
    logger.info({ msg: `Starting service on port ${PORT}` })
    await app.listen({ port: parseInt(PORT), host: '0.0.0.0' })
  } catch (error) {
    logger.error({ message: 'Failed to start server', error })
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await app.close()
  await sequelize.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await app.close()
  await sequelize.close()
  process.exit(0)
})

start()