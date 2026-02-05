import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import { PORT, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, MAX_PAYLOAD_SIZE, LOG_LEVEL } from './config'
import { logger, pinoConfig } from './logger'
import { sequelize, getPoolStats } from './dbClient'
import { authenticateJWT, AuthenticatedRequest, authenticatedShinzoCredentials, getProviderCredentials, constructModelAPIResponseHeaders } from './middleware/auth'
import { PassThrough } from 'stream'

// Type guard for streaming responses
function isStreamingResponse(result: any): result is { stream: PassThrough; isStreaming: true; status: number; responseHeaders: any } {
  return result.isStreaming === true && result.stream instanceof PassThrough
}

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
  handleGoogleOAuthUrl,
  handleGoogleOAuthCallback,
  handleGithubOAuthUrl,
  handleGithubOAuthCallback,
  oauthCallbackSchema
} from './handlers/oauth'

import {
  handleGetAuthMethods,
  handleGetOAuthAccounts,
  handleUnlinkOAuthProvider
} from './handlers/oauthAccount'

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

import {
  handleSaveUserPreference,
  handleGetUserPreferences,
  handleDeleteUserPreference,
  savePreferenceSchema,
  getPreferenceSchema
} from './handlers/userPreferences'

import {
  handleSaveUserSurvey,
  handleGetUserSurvey,
  saveSurveySchema
} from './handlers/userSurvey'

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
  handleCountTokens,
  handleModelProxy,
  handleEventLogging,
  modelAPISpec,
  // Analytics handlers
  handleFetchTokenAnalytics,
  handleFetchSessionAnalytics,
  handleFetchSessionDetail,
  handleFetchSessionDetailByShareToken,
  fetchAnalyticsSchema,
  // Session sharing handlers
  handleCreateSessionShare,
  handleDeleteSessionShare,
  handleGetSessionShareStatus,
  handleFetchSharedSessionDetail,
} from './handlers/spotlight'

logger.info('STARTUP: server.ts - All imports loaded, creating Fastify instance')

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

// Health check state - track database connectivity without checking on every request
let dbHealthy = false
let lastDbCheck = 0
const DB_CHECK_INTERVAL = 30_000 // Check database every 30 seconds, not on every health probe

// Background database health check
const checkDatabaseHealth = async () => {
  try {
    await sequelize.authenticate()
    dbHealthy = true
    lastDbCheck = Date.now()
  } catch (error) {
    logger.error({ message: 'Database health check failed', error })
    dbHealthy = false
    lastDbCheck = Date.now()
  }
}

// Start periodic database health check
setInterval(checkDatabaseHealth, DB_CHECK_INTERVAL)
// Initial check on startup (already done in start() but this updates our flag)
checkDatabaseHealth()

// Health check endpoint - fast response using cached state
// This prevents connection pool exhaustion from frequent Kubernetes probes
app.get('/health', async (request, reply) => {
  const now = Date.now()

  // If we haven't checked in a while (e.g., server just started), check now
  if (now - lastDbCheck > DB_CHECK_INTERVAL * 2) {
    await checkDatabaseHealth()
  }

  if (dbHealthy) {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      dbLastChecked: new Date(lastDbCheck).toISOString()
    })
  } else {
    reply.status(503).send({
      status: 'error',
      message: 'Database connection unhealthy',
      dbLastChecked: new Date(lastDbCheck).toISOString()
    })
  }
})

// Deep health check endpoint for manual diagnostics (not used by Kubernetes probes)
app.get('/health/deep', async (request, reply) => {
  try {
    const startTime = Date.now()
    await sequelize.authenticate()
    const dbLatency = Date.now() - startTime

    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latencyMs: dbLatency
      },
      pool: getPoolStats()
    })
  } catch (error: any) {
    reply.status(503).send({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    })
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

// OAuth endpoints
app.get('/auth/oauth/google', async (request: FastifyRequest<{ Querystring: { returnTo?: string } }>, reply: FastifyReply) => {
  try {
    const { returnTo } = request.query
    const result = await handleGoogleOAuthUrl(returnTo)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Google OAuth URL error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.post('/auth/oauth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await oauthCallbackSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleGoogleOAuthCallback(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Google OAuth callback error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/auth/oauth/github', async (request: FastifyRequest<{ Querystring: { returnTo?: string } }>, reply: FastifyReply) => {
  try {
    const { returnTo } = request.query
    const result = await handleGithubOAuthUrl(returnTo)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'GitHub OAuth URL error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.post('/auth/oauth/github/callback', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedBody = await oauthCallbackSchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleGithubOAuthCallback(validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'GitHub OAuth callback error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

// OAuth account management endpoints
app.get('/auth/methods', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleGetAuthMethods(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Get auth methods error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.get('/auth/oauth/accounts', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleGetOAuthAccounts(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Get OAuth accounts error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.delete('/auth/oauth/accounts/:provider', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { provider } = request.params as { provider: string }
    const result = await handleUnlinkOAuthProvider(request.user!.uuid, provider)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Unlink OAuth provider error', error })
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

// User survey endpoints
app.post('/user/survey', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const validatedBody = await saveSurveySchema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const result = await handleSaveUserSurvey(request.user!.uuid, validatedBody)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Save user survey error', error })
    if (error.name === 'ValidationError') {
      reply.status(400).send({ error: error.message })
    } else {
      reply.status(500).send({ error: 'Internal server error' })
    }
  }
})

app.get('/user/survey', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const result = await handleGetUserSurvey(request.user!.uuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Get user survey error', error })
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

// ============================================================================
// Spotlight - AI Agent Analytics
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

// Event logging endpoint (separate from /v1/ endpoints)
app.post('/spotlight/:provider/api/event_logging/batch', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const shinzoCredentials = await authenticatedShinzoCredentials(request)
    if (!shinzoCredentials.apiKey) {
      reply.status(401).send({ error: 'Shinzo API key authentication failed' })
      return
    }

    const { provider } = request.params as { provider: string }

    if (provider !== 'anthropic') {
      reply.status(400).send({ error: 'Unsupported provider' })
      return
    }

    const providerCredentials = await getProviderCredentials(request, provider, shinzoCredentials)
    if (!providerCredentials.providerKey) {
      reply.status(401).send({ error: 'Provider key authentication failed' })
      return
    }

    const result = await handleEventLogging(
      shinzoCredentials,
      provider,
      providerCredentials,
      request.headers,
      request.body,
    )

    constructModelAPIResponseHeaders(result, reply)

    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Event logging error', error })
    reply.status(500).send({ error: { type: 'internal_error', message: 'Internal server error' } })
  }
})

app.all('/spotlight/:provider/v1/*', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const shinzoCredentials = await authenticatedShinzoCredentials(request)
    if (!shinzoCredentials.apiKey) {
      reply.status(401).send({ error: 'Shinzo API key authentication failed' })
      return    
    }

    // Extract the endpoint path including /v1/ prefix
    // e.g., /spotlight/anthropic/v1/messages/count_tokens?beta=true -> /v1/messages/count_tokens
    const urlWithoutQuery = request.url.split('?')[0] // Remove query params
    const match = urlWithoutQuery.match(/^\/spotlight\/([^\/]+)(\/v1\/.*)$/)
    const endpointPath = match?.[2] || '' // Extract /v1/... part

    let result

    const { provider } = request.params as { provider: string }

    const providerCredentials = await getProviderCredentials(request, provider, shinzoCredentials)
    if (!providerCredentials.providerKey) {
      reply.status(401).send({ error: 'Provider key authentication failed' })
      return
    }

    if (provider === 'anthropic') {
      switch(endpointPath) {
        case modelAPISpec.anthropic.countTokens:
          result = await handleCountTokens(
            shinzoCredentials,
            provider,
            providerCredentials,
            request.headers,
            request.body,
          )
          break
        case modelAPISpec.anthropic.modelProxy:
          result = await handleModelProxy(
            shinzoCredentials,
            provider,
            providerCredentials,
            request.headers,
            request.body,
          )
          break
        case modelAPISpec.anthropic.eventLogging:
          result = await handleEventLogging(
            shinzoCredentials,
            provider,
            providerCredentials,
            request.headers,
            request.body,
          )
          break
        default:
          reply.status(404).send({ error: `Endpoint ${endpointPath} not found` })
          return
      }
    } else {
      reply.status(400).send({ error: 'Unsupported provider' })
      return
    }

    constructModelAPIResponseHeaders(result, reply)

    // Handle streaming responses
    if (isStreamingResponse(result)) {
      reply.status(result.status || 200)
      reply.header('Content-Type', 'text/event-stream')
      reply.header('Cache-Control', 'no-cache')
      reply.header('Connection', 'keep-alive')
      reply.header('X-Accel-Buffering', 'no') // Disable buffering for nginx
      return reply.send(result.stream)
    }

    // Handle normal responses
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Model provider proxy error', error })
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

// Get session detail by share token (authenticated)
app.get('/spotlight/analytics/sessions/share/:shareToken', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { shareToken } = request.params as { shareToken: string }
    const result = await handleFetchSessionDetailByShareToken(request.user!.uuid, shareToken)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch session detail by share token error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// Session sharing endpoints
app.post('/spotlight/analytics/sessions/:sessionUuid/share', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { sessionUuid } = request.params as { sessionUuid: string }
    const result = await handleCreateSessionShare(request.user!.uuid, sessionUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Create session share error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.delete('/spotlight/analytics/sessions/:sessionUuid/share', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { sessionUuid } = request.params as { sessionUuid: string }
    const result = await handleDeleteSessionShare(request.user!.uuid, sessionUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Delete session share error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

app.get('/spotlight/analytics/sessions/:sessionUuid/share', async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authenticated = await authenticateJWT(request, reply)
  if (!authenticated) return

  try {
    const { sessionUuid } = request.params as { sessionUuid: string }
    const result = await handleGetSessionShareStatus(request.user!.uuid, sessionUuid)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Get session share status error', error })
    reply.status(500).send({ error: 'Internal server error' })
  }
})

// Public shared session endpoint (no authentication required)
app.get('/spotlight/analytics/sessions/shared/:shareToken', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { shareToken } = request.params as { shareToken: string }
    const result = await handleFetchSharedSessionDetail(shareToken)
    reply.status(result.status || 200).send(result.response)
  } catch (error: any) {
    logger.error({ message: 'Fetch shared session detail error', error })
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
    logger.info('STARTUP: Entering start() function')

    // Test database connection with timeout
    logger.info('STARTUP: About to call sequelize.authenticate()')
    const authenticatePromise = sequelize.authenticate()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database authentication timed out after 10 seconds')), 10000)
    )
    await Promise.race([authenticatePromise, timeoutPromise])
    logger.info('STARTUP: Database connection established successfully')

    // Mark database as healthy for health checks (this ensures immediate readiness)
    dbHealthy = true
    lastDbCheck = Date.now()
    logger.info('STARTUP: Database health flag set to true')

    // Start server
    logger.info({ msg: `STARTUP: Starting Fastify server on port ${PORT}` })
    await app.listen({ port: parseInt(PORT), host: '0.0.0.0' })
    logger.info({ msg: `STARTUP: Server successfully listening on port ${PORT}` })
  } catch (error) {
    logger.error({ message: 'STARTUP ERROR: Failed to start server', error })
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

logger.info('STARTUP: Server module loaded, about to call start()')
start()