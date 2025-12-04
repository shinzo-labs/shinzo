import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import { PORT, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, MAX_PAYLOAD_SIZE, LOG_LEVEL } from './config'
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
  handleFetchUser,
  handleFetchUserQuota
} from './handlers/auth'

import {
  handleFetchResources,
  handleFetchTraces,
  handleFetchSpans,
  handleFetchMetrics,
  handleFetchResourceAnalytics,
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

import {
  handleSaveUserPreference,
  handleGetUserPreferences,
  handleDeleteUserPreference,
  savePreferenceSchema,
  getPreferenceSchema
} from './handlers/userPreferences'

import {
  // Shinzo API Key handlers
  handleCreateShinzoApiKey,
  handleFetchShinzoApiKeys,
  handleUpdateShinzoApiKey,
  handleDeleteShinzoApiKey,
  createShinzoApiKeySchema,
  updateShinzoApiKeySchema,
  // Provider Key handlers
  handleCreateProviderKey,
  handleFetchProviderKeys,
  handleUpdateProviderKey,
  handleDeleteProviderKey,
  handleTestProviderKey,
  createProviderKeySchema,
  updateProviderKeySchema,
  testProviderKeySchema,
  // Model Proxy
  handleModelProxy,
  // Analytics handlers
  handleFetchTokenAnalytics,
  handleFetchSessionAnalytics,
  handleFetchSessionDetail,
  fetchAnalyticsSchema
} from './handlers/spotlight'

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

// Request logging hook for debug/trace level
app.addHook('preHandler', async (request, reply) => {
  if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'trace') {
    logger.debug({
      message: 'Incoming request',
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body
    })
  }
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

app.get('/auth/fetch_user_quota', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleFetchUserQuota(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch user quota error', error })
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

// User preferences endpoints
app.post('/user/preferences', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedBody = await savePreferenceSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleSaveUserPreference(request.user!.uuid, validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Save user preference error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/user/preferences', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedQuery = await getPreferenceSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleGetUserPreferences(request.user!.uuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Get user preferences error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.delete('/user/preferences/:preferenceKey', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { preferenceKey } = request.params as { preferenceKey: string }
    const result = await handleDeleteUserPreference(request.user!.uuid, preferenceKey)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Delete user preference error', error })
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

app.get('/telemetry/fetch_resource_analytics/:resourceUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { resourceUuid } = request.params as { resourceUuid: string }
    const validatedQuery = await fetchDataSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleFetchResourceAnalytics(request.user!.uuid, resourceUuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch resource analytics error', error })
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

// ============================================================================
// Spotlight - Shinzo API Key Management
// ============================================================================

app.post('/spotlight/shinzo_keys', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedBody = await createShinzoApiKeySchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleCreateShinzoApiKey(request.user!.uuid, validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Create Shinzo API key error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/spotlight/shinzo_keys', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleFetchShinzoApiKeys(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch Shinzo API keys error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.put('/spotlight/shinzo_keys/:keyUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { keyUuid } = request.params as { keyUuid: string }
    const validatedBody = await updateShinzoApiKeySchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleUpdateShinzoApiKey(request.user!.uuid, keyUuid, validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Update Shinzo API key error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.delete('/spotlight/shinzo_keys/:keyUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { keyUuid } = request.params as { keyUuid: string }
    const result = await handleDeleteShinzoApiKey(request.user!.uuid, keyUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Delete Shinzo API key error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// ============================================================================
// Spotlight - Provider Key Management
// ============================================================================

app.post('/spotlight/provider_keys/test', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await testProviderKeySchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleTestProviderKey(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Test provider key error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.post('/spotlight/provider_keys', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedBody = await createProviderKeySchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleCreateProviderKey(request.user!.uuid, validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Create provider key error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/spotlight/provider_keys', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleFetchProviderKeys(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch provider keys error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.put('/spotlight/provider_keys/:keyUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { keyUuid } = request.params as { keyUuid: string }
    const validatedBody = await updateProviderKeySchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleUpdateProviderKey(request.user!.uuid, keyUuid, validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Update provider key error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.delete('/spotlight/provider_keys/:keyUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { keyUuid } = request.params as { keyUuid: string }
    const result = await handleDeleteProviderKey(request.user!.uuid, keyUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Delete provider key error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// ============================================================================
// Spotlight - Model Proxy (Updated Architecture)
// ============================================================================

app.post('/spotlight/:provider/v1/messages', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { provider } = request.params as { provider: string }
    const shinzoApiKey = request.headers.authorization?.replace('Bearer ', '')

    if (!shinzoApiKey) {
      reply.status(401).send({
        error: {
          type: 'authentication_error',
          message: 'Missing Authorization header with Shinzo API key'
        }
      })
      return
    }

    // Validate provider
    const validProviders = ['anthropic', 'openai', 'google']
    if (!validProviders.includes(provider)) {
      reply.status(400).send({
        error: {
          type: 'invalid_request',
          message: `Invalid provider: ${provider}. Supported providers: ${validProviders.join(', ')}`
        }
      })
      return
    }

    const result = await handleModelProxy(shinzoApiKey, provider, request.body as any)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Model proxy error', error })
    reply.status(500).send({ error: { type: 'internal_error', message: 'Internal server error' } })
  }
})

// Spotlight Analytics endpoints
app.get('/spotlight/analytics/tokens', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedQuery = await fetchAnalyticsSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleFetchTokenAnalytics(request.user!.uuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch token analytics error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})


app.get('/spotlight/analytics/sessions', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedQuery = await fetchAnalyticsSchema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleFetchSessionAnalytics(request.user!.uuid, validatedQuery)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch session analytics error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/spotlight/analytics/sessions/:sessionUuid', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { sessionUuid } = request.params as { sessionUuid: string }
    const result = await handleFetchSessionDetail(request.user!.uuid, sessionUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch session detail error', error })
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