import * as yup from 'yup'
import { Session, Interaction, ToolUsage } from '../models'
import { logger } from '../logger'
import { Op } from 'sequelize'
import axios from 'axios'
import {
  generateShinzoApiKey,
  encryptProviderKey,
  getProviderKeyPrefix,
  KeyType,
} from '../utils'
import { sequelize } from '../dbClient'
import { ShinzoCredentials, ProviderCredentials, constructModelAPIHeaders } from '../middleware/auth'
import { parseSSEStream, processSSEEvent, MessageState } from '../utils/sseParser'
import { PassThrough } from 'stream'

const TEST_TIMEOUT = 10 * 1000 // 10 seconds
const COUNT_TOKENS_TIMEOUT = 30 * 1000 // 30 seconds
const REQUEST_TIMEOUT = 2 * 60 * 1000 // 2 minutes

const SUPPORTED_PROVIDERS = ['anthropic']

export const modelAPISpec: Record<typeof SUPPORTED_PROVIDERS[number], Record<string, string>> = {
  anthropic: {
    countTokens: '/v1/messages/count_tokens',
    modelProxy: '/v1/messages',
    eventLogging: '/api/event_logging/batch',
  }
}

const modelProviderBaseURL: Record<typeof SUPPORTED_PROVIDERS[number], string> = {
  anthropic: 'https://api.anthropic.com'
}

export const createShinzoApiKeySchema = yup.object({
  key_name: yup.string().required('Key name is required'),
  key_type: yup.string().oneOf(['live', 'test']).default('live'),
}).required()

export const updateShinzoApiKeySchema = yup.object({
  key_name: yup.string().optional(),
  status: yup.string().oneOf(['active', 'inactive', 'revoked']).optional(),
}).required()

export const createProviderKeySchema = yup.object({
  provider: yup.string().oneOf(SUPPORTED_PROVIDERS).required('Provider is required'),
  provider_api_key: yup.string().required('Provider API key is required'),
  provider_base_url: yup.string().url().nullable(),
  label: yup.string().nullable(),
}).required()

export const updateProviderKeySchema = yup.object({
  provider_api_key: yup.string().optional(),
  provider_base_url: yup.string().url().nullable(),
  label: yup.string().nullable(),
  status: yup.string().oneOf(['active', 'inactive', 'revoked']).optional(),
}).required()

export const testProviderKeySchema = yup.object({
  provider: yup.string().oneOf(SUPPORTED_PROVIDERS).required(),
  provider_api_key: yup.string().required(),
  provider_base_url: yup.string().url().nullable(),
}).required()

export const fetchAnalyticsSchema = yup.object({
  start_date: yup.date().optional(),
  end_date: yup.date().optional(),
  session_id: yup.string().optional(),
  model: yup.string().optional(),
  provider: yup.string().optional(),
}).optional()

// ============================================================================
// Shinzo API Key CRUD Operations
// ============================================================================

export const handleCreateShinzoApiKey = async (
  userUuid: string,
  request: yup.InferType<typeof createShinzoApiKeySchema>
) => {
  try {
    const { apiKey, keyPrefix } = generateShinzoApiKey(request.key_type as KeyType)

    const [results] = await sequelize.query(
      `INSERT INTO spotlight.shinzo_api_key
       (user_uuid, key_name, api_key, key_prefix, key_type, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING uuid, created_at, updated_at, user_uuid, key_name, api_key, key_prefix, key_type, status, last_used`,
      { bind: [userUuid, request.key_name, apiKey, keyPrefix, request.key_type] }
    )

    const newKey = results[0] as any as any

    logger.info({ message: 'Shinzo API key created successfully', userUuid, keyUuid: newKey.uuid })

    return {
      response: {
        uuid: newKey.uuid,
        key_name: newKey.key_name,
        api_key: newKey.api_key,
        key_prefix: newKey.key_prefix,
        key_type: newKey.key_type,
        status: newKey.status,
        created_at: newKey.created_at,
      },
      status: 201
    }
  } catch (error) {
    logger.error({ message: 'Error creating Shinzo API key', error, userUuid })
    return {
      response: 'Error creating Shinzo API key',
      error: true,
      status: 500
    }
  }
}

export const handleFetchShinzoApiKeys = async (userUuid: string) => {
  try {
    const [results] = await sequelize.query(
      `SELECT uuid, key_name, api_key, key_prefix, key_type, status, last_used, created_at, updated_at
       FROM spotlight.shinzo_api_key
       WHERE user_uuid = $1
       ORDER BY created_at DESC`,
      { bind: [userUuid] })

    return {
      response: {
        shinzo_api_keys: results,
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching Shinzo API keys', error, userUuid })
    return {
      response: 'Error fetching Shinzo API keys',
      error: true,
      status: 500
    }
  }
}

export const handleUpdateShinzoApiKey = async (
  userUuid: string,
  keyUuid: string,
  request: yup.InferType<typeof updateShinzoApiKeySchema>
) => {
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (request.key_name !== undefined) {
      updates.push(`key_name = $${paramCount++}`)
      values.push(request.key_name)
    }
    if (request.status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      values.push(request.status)
    }

    if (updates.length === 0) {
      return {
        response: 'No fields to update',
        error: true,
        status: 400
      }
    }

    values.push(keyUuid, userUuid)

    const [results] = await sequelize.query(
      `UPDATE spotlight.shinzo_api_key
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE uuid = $${paramCount++} AND user_uuid = $${paramCount++}
       RETURNING uuid, key_name, key_prefix, key_type, status, updated_at`,
      { bind: values }
    )

    if ((results?.length ?? 0) === 0) {
      return {
        response: 'Shinzo API key not found',
        error: true,
        status: 404
      }
    }

    logger.info({ message: 'Shinzo API key updated successfully', userUuid, keyUuid })

    return {
      response: results?.[0] as any,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error updating Shinzo API key', error, userUuid, keyUuid })
    return {
      response: 'Error updating Shinzo API key',
      error: true,
      status: 500
    }
  }
}

export const handleDeleteShinzoApiKey = async (userUuid: string, keyUuid: string) => {
  try {
    const [results] = await sequelize.query(
      `DELETE FROM spotlight.shinzo_api_key
       WHERE uuid = $1 AND user_uuid = $2
       RETURNING uuid`,
      { bind: [keyUuid, userUuid] })

    if (!results?.length) {
      return {
        response: 'Shinzo API key not found',
        error: true,
        status: 404
      }
    }

    logger.info({ message: 'Shinzo API key deleted successfully', userUuid, keyUuid })

    return {
      response: { message: 'Shinzo API key deleted successfully' },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error deleting Shinzo API key', error, userUuid, keyUuid })
    return {
      response: 'Error deleting Shinzo API key',
      error: true,
      status: 500
    }
  }
}

// ============================================================================
// Provider Key CRUD Operations
// ============================================================================

export const handleTestProviderKey = async (
  request: yup.InferType<typeof testProviderKeySchema>
) => {
  try {
    const url = `${modelProviderBaseURL[request.provider]}${modelAPISpec[request.provider].modelProxy}`

    const testBody = request.provider === 'anthropic'
      ? {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }
      : {
          model: 'gpt-3.5-turbo',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }

    await axios.post(url, testBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.provider_api_key,
        'Authorization': `Bearer ${request.provider_api_key}`,
        'anthropic-version': '2023-06-01', // TODO is this necessary?
      },
      timeout: TEST_TIMEOUT,
    })

    return {
      response: { message: 'Provider key is valid', success: true },
      status: 200
    }
  } catch (error: any) {
    logger.warn({ message: 'Provider key test failed', error: error.message })

    if (error.response?.status === 401) {
      return {
        response: { message: 'Invalid API key', success: false },
        error: true,
        status: 200
      }
    }

    return {
      response: { message: 'Connection test failed', success: false },
      error: true,
      status: 200
    }
  }
}

export const handleCreateProviderKey = async (
  userUuid: string,
  request: yup.InferType<typeof createProviderKeySchema>
) => {
  try {
    const { encryptedKey, iv } = encryptProviderKey(request.provider_api_key)
    const keyPrefix = getProviderKeyPrefix(request.provider_api_key)
    const baseUrl = modelProviderBaseURL[request.provider]
    if (!baseUrl) {
      return {
        response: 'Invalid provider',
        error: true,
        status: 400
      }
    }

    // Future TODO: remove provider_base_url from provider key table (it's unnecessary)

    const [results] = await sequelize.query(
      `INSERT INTO spotlight.provider_key
       (user_uuid, provider, provider_base_url, label, encrypted_key, key_prefix, encryption_iv, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING uuid, created_at, updated_at, user_uuid, provider, provider_base_url, label, key_prefix, status, last_used`,
      { bind: [userUuid, request.provider, baseUrl, request.label, encryptedKey, keyPrefix, iv] })

    const newKey = results[0] as any

    logger.info({ message: 'Provider key created successfully', userUuid, keyUuid: newKey.uuid, provider: request.provider })

    return {
      response: {
        uuid: newKey.uuid,
        provider: newKey.provider,
        provider_base_url: newKey.provider_base_url,
        label: newKey.label,
        key_prefix: newKey.key_prefix,
        status: newKey.status,
        created_at: newKey.created_at,
      },
      status: 201
    }
  } catch (error) {
    logger.error({ message: 'Error creating provider key', error, userUuid })
    return {
      response: 'Error creating provider key',
      error: true,
      status: 500
    }
  }
}

export const handleFetchProviderKeys = async (userUuid: string) => {
  try {
    const [results] = await sequelize.query(
      `SELECT uuid, provider, provider_base_url, label, key_prefix, status, last_used, last_validated, created_at, updated_at
       FROM spotlight.provider_key
       WHERE user_uuid = $1
       ORDER BY created_at DESC`,
      { bind: [userUuid] })

    return {
      response: {
        provider_keys: results,
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching provider keys', error, userUuid })
    return {
      response: 'Error fetching provider keys',
      error: true,
      status: 500
    }
  }
}

export const handleUpdateProviderKey = async (
  userUuid: string,
  keyUuid: string,
  request: yup.InferType<typeof updateProviderKeySchema>
) => {
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (request.provider_api_key !== undefined) {
      const { encryptedKey, iv } = encryptProviderKey(request.provider_api_key)
      const keyPrefix = getProviderKeyPrefix(request.provider_api_key)
      updates.push(`encrypted_key = $${paramCount++}`)
      values.push(encryptedKey)
      updates.push(`encryption_iv = $${paramCount++}`)
      values.push(iv)
      updates.push(`key_prefix = $${paramCount++}`)
      values.push(keyPrefix)
    }
    if (request.provider_base_url !== undefined) {
      updates.push(`provider_base_url = $${paramCount++}`)
      values.push(request.provider_base_url)
    }
    if (request.label !== undefined) {
      updates.push(`label = $${paramCount++}`)
      values.push(request.label)
    }
    if (request.status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      values.push(request.status)
    }

    if (updates.length === 0) {
      return {
        response: 'No fields to update',
        error: true,
        status: 400
      }
    }

    values.push(keyUuid, userUuid)

    const [results] = await sequelize.query(
      `UPDATE spotlight.provider_key
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE uuid = $${paramCount++} AND user_uuid = $${paramCount++}
       RETURNING uuid, provider, provider_base_url, label, key_prefix, status, updated_at`,
      { bind: values }
    )

    if ((results?.length ?? 0) === 0) {
      return {
        response: 'Provider key not found',
        error: true,
        status: 404
      }
    }

    logger.info({ message: 'Provider key updated successfully', userUuid, keyUuid })

    return {
      response: results?.[0] as any,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error updating provider key', error, userUuid, keyUuid })
    return {
      response: 'Error updating provider key',
      error: true,
      status: 500
    }
  }
}

export const handleDeleteProviderKey = async (userUuid: string, keyUuid: string) => {
  try {
    const [results] = await sequelize.query(
      `DELETE FROM spotlight.provider_key
       WHERE uuid = $1 AND user_uuid = $2
       RETURNING uuid`,
      { bind: [keyUuid, userUuid] })

    if (!results?.length) {
      return {
        response: 'Provider key not found',
        error: true,
        status: 404
      }
    }

    logger.info({ message: 'Provider key deleted successfully', userUuid, keyUuid })

    return {
      response: { message: 'Provider key deleted successfully' },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error deleting provider key', error, userUuid, keyUuid })
    return {
      response: 'Error deleting provider key',
      error: true,
      status: 500
    }
  }
}

export const handleModelProxy = async (
  shinzoCredentials: ShinzoCredentials,
  provider: string,
  providerCredentials: ProviderCredentials,
  requestHeaders: Record<string, string | string[] | undefined>,
  requestBody: any,
) => {
  try {
    const requestTimestamp = new Date()
    const isStreaming = requestBody.stream === true

    const { apiKeyUuid, userUuid } = shinzoCredentials
    const { providerKeyUuid, authType } = providerCredentials

    let session: any = null
    const sessionId = requestBody.metadata?.user_id || 'default-session'

    // Use INSERT ... ON CONFLICT to prevent race conditions when creating sessions
    const [sessionResults] = await sequelize.query(
      `INSERT INTO spotlight.session (user_uuid, api_key_uuid, shinzo_api_key_uuid, session_id, start_time)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_uuid, shinzo_api_key_uuid, session_id)
        WHERE end_time IS NULL
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING uuid, total_requests, total_input_tokens, total_output_tokens, total_cache_creation_ephemeral_5m_input_tokens, total_cache_creation_ephemeral_1h_input_tokens`,
      { bind: [userUuid, providerKeyUuid, apiKeyUuid, sessionId, requestTimestamp] }
    )
    session = sessionResults[0] as any

    const [interactionResults] = await sequelize.query(
      `INSERT INTO spotlight.interaction
       (session_uuid, user_uuid, api_key_uuid, shinzo_api_key_uuid, request_timestamp, model, provider,
        max_tokens, temperature, system_prompt, request_data, status, auth_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)
       RETURNING uuid`,
      { bind: [
        session.uuid,
        userUuid,
        providerKeyUuid,
        apiKeyUuid,
        requestTimestamp,
        requestBody.model || 'unknown',
        provider,
        requestBody.max_tokens || null,
        requestBody.temperature || null,
        requestBody.system || null,
        JSON.stringify(requestBody),
        authType
      ] })

    const interaction = interactionResults[0] as any

    try {
      const url = `${modelProviderBaseURL[provider]}${modelAPISpec[provider].modelProxy}`
      const headers = constructModelAPIHeaders(requestHeaders)

      // Handle streaming requests
      if (isStreaming) {
        return await handleStreamingRequest(
          url,
          headers,
          requestBody,
          provider,
          userUuid,
          interaction,
          session,
          requestTimestamp
        )
      }

      // Handle non-streaming requests (original logic)
      const providerResponse = await axios.post(url, requestBody, { headers, timeout: REQUEST_TIMEOUT })

      const responseTimestamp = new Date()
      const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime()

      // Extract usage data
      const usage = providerResponse.data.usage || {}
      const inputTokens = usage.input_tokens || 0
      const outputTokens = usage.output_tokens || 0
      const cacheCreation = usage.cache_creation || {}
      const cacheCreation5m = cacheCreation.ephemeral_5m_input_tokens || 0
      const cacheCreation1h = cacheCreation.ephemeral_1h_input_tokens || 0
      const cacheReadTokens = usage.cache_read_input_tokens || 0

      await sequelize.query(
        `UPDATE spotlight.interaction
         SET response_timestamp = $1, response_id = $2, stop_reason = $3, latency_ms = $4,
             input_tokens = $5, output_tokens = $6, cache_creation_ephemeral_5m_input_tokens = $7,
             cache_creation_ephemeral_1h_input_tokens = $8, cache_read_input_tokens = $9,
             response_data = $10, status = 'success', updated_at = CURRENT_TIMESTAMP
         WHERE uuid = $11`,
        { bind: [
          responseTimestamp,
          providerResponse.data.id || null,
          providerResponse.data.stop_reason || null,
          latencyMs,
          inputTokens,
          outputTokens,
          cacheCreation5m,
          cacheCreation1h,
          cacheReadTokens,
          JSON.stringify(providerResponse.data),
          interaction.uuid
        ] })

      await sequelize.query(
        `UPDATE spotlight.session
         SET total_requests = total_requests + 1,
             total_input_tokens = total_input_tokens + $1,
             total_output_tokens = total_output_tokens + $2,
             total_cache_creation_ephemeral_5m_input_tokens = total_cache_creation_ephemeral_5m_input_tokens + $3,
             total_cache_creation_ephemeral_1h_input_tokens = total_cache_creation_ephemeral_1h_input_tokens + $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE uuid = $5`,
        { bind: [inputTokens, outputTokens, cacheCreation5m, cacheCreation1h, session.uuid] })

      return {
        response: providerResponse.data,
        responseHeaders: providerResponse.headers,
        status: providerResponse.status
      }
    } catch (providerError: any) {
      logger.error({
        message: 'Error proxying to provider',
        error: providerError,
        provider,
        userUuid
      })

      await sequelize.query(
        `UPDATE spotlight.interaction
         SET error_message = $1, error_type = $2, status = 'error', updated_at = CURRENT_TIMESTAMP
         WHERE uuid = $3`,
        { bind: [
          providerError.message,
          providerError.response?.data?.error?.type || 'unknown',
          interaction.uuid
        ] })

      return {
        response: {
          error: {
            type: 'provider_error',
            message: providerError.response?.data?.error?.message || providerError.message,
          }
        },
        error: true,
        status: providerError.response?.status || 500
      }
    }
  } catch (error: any) {
    logger.error({ message: 'Error in model proxy handler', error })
    return {
      response: { error: { type: 'internal_error', message: 'Internal server error' } },
      error: true,
      status: 500
    }
  }
}

async function handleStreamingRequest(
  url: string,
  headers: Record<string, string>,
  requestBody: any,
  provider: string,
  userUuid: string,
  interaction: any,
  session: any,
  requestTimestamp: Date
) {
  try {
    // Make streaming request to provider
    const providerResponse = await axios.post(url, requestBody, {
      headers,
      timeout: REQUEST_TIMEOUT,
      responseType: 'stream'
    })

    // Create a PassThrough stream to proxy events to the client
    const clientStream = new PassThrough()

    // Initialize message state for accumulation
    let messageState: MessageState = {
      content: [],
      usage: {}
    }

    // Process the SSE stream
    ;(async () => {
      try {
        for await (const event of parseSSEStream(providerResponse.data)) {
          // Update accumulated message state
          messageState = processSSEEvent(event, messageState)

          // Proxy the event to the client (re-serialize the parsed data)
          const eventString = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`
          clientStream.write(eventString)
        }

        // Stream complete - save to database
        const responseTimestamp = new Date()
        const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime()

        const usage = messageState.usage || {}
        const inputTokens = usage.input_tokens || 0
        const outputTokens = usage.output_tokens || 0
        const cacheCreation = usage.cache_creation || {}
        const cacheCreation5m = cacheCreation.ephemeral_5m_input_tokens || 0
        const cacheCreation1h = cacheCreation.ephemeral_1h_input_tokens || 0
        const cacheReadTokens = usage.cache_read_input_tokens || 0

        await sequelize.query(
          `UPDATE spotlight.interaction
           SET response_timestamp = $1, response_id = $2, stop_reason = $3, latency_ms = $4,
               input_tokens = $5, output_tokens = $6, cache_creation_ephemeral_5m_input_tokens = $7,
               cache_creation_ephemeral_1h_input_tokens = $8, cache_read_input_tokens = $9,
               response_data = $10, status = 'success', updated_at = CURRENT_TIMESTAMP
           WHERE uuid = $11`,
          { bind: [
            responseTimestamp,
            messageState.id || null,
            messageState.stop_reason || null,
            latencyMs,
            inputTokens,
            outputTokens,
            cacheCreation5m,
            cacheCreation1h,
            cacheReadTokens,
            JSON.stringify(messageState),
            interaction.uuid
          ] })

        await sequelize.query(
          `UPDATE spotlight.session
           SET total_requests = total_requests + 1,
               total_input_tokens = total_input_tokens + $1,
               total_output_tokens = total_output_tokens + $2,
               total_cache_creation_ephemeral_5m_input_tokens = total_cache_creation_ephemeral_5m_input_tokens + $3,
               total_cache_creation_ephemeral_1h_input_tokens = total_cache_creation_ephemeral_1h_input_tokens + $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE uuid = $5`,
          { bind: [inputTokens, outputTokens, cacheCreation5m, cacheCreation1h, session.uuid] })

        logger.info({
          message: 'Streaming response completed',
          interactionUuid: interaction.uuid,
          messageId: messageState.id
        })

        clientStream.end()
      } catch (streamError: any) {
        logger.error({
          message: 'Error processing SSE stream',
          error: streamError,
          provider,
          userUuid
        })

        await sequelize.query(
          `UPDATE spotlight.interaction
           SET error_message = $1, error_type = $2, status = 'error', updated_at = CURRENT_TIMESTAMP
           WHERE uuid = $3`,
          { bind: [
            streamError.message,
            'stream_processing_error',
            interaction.uuid
          ] })

        clientStream.destroy(streamError)
      }
    })()

    return {
      stream: clientStream,
      responseHeaders: providerResponse.headers,
      status: providerResponse.status,
      isStreaming: true
    }
  } catch (error: any) {
    logger.error({
      message: 'Error initiating streaming request',
      error,
      provider,
      userUuid
    })

    await sequelize.query(
      `UPDATE spotlight.interaction
       SET error_message = $1, error_type = $2, status = 'error', updated_at = CURRENT_TIMESTAMP
       WHERE uuid = $3`,
      { bind: [
        error.message,
        error.response?.data?.error?.type || 'unknown',
        interaction.uuid
      ] })

    return {
      response: {
        error: {
          type: 'provider_error',
          message: error.response?.data?.error?.message || error.message,
        }
      },
      error: true,
      status: error.response?.status || 500
    }
  }
}

export const handleCountTokens = async (
  shinzoCredentials: ShinzoCredentials,
  provider: string,
  providerCredentials: ProviderCredentials,
  requestHeaders: Record<string, string | string[] | undefined>,
  requestBody: any,
) => {
  try {
    const { apiKeyUuid, userUuid } = shinzoCredentials
    const { providerKeyUuid, authType } = providerCredentials
    const requestTimestamp = new Date()
    const messageCount = requestBody.messages?.length || 0
    const hasSystemPrompt = !!requestBody.system
    const hasTools = !!requestBody.tools && requestBody.tools.length > 0

    const [tokenCountResults] = await sequelize.query(
      `INSERT INTO spotlight.token_count_request
       (user_uuid, api_key_uuid, shinzo_api_key_uuid, request_timestamp, model, provider,
        has_system_prompt, has_tools, message_count, request_data, status, auth_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
       RETURNING uuid`,
      { bind: [
        userUuid,
        providerKeyUuid,
        apiKeyUuid,
        requestTimestamp,
        requestBody.model || 'unknown',
        provider,
        hasSystemPrompt,
        hasTools,
        messageCount,
        JSON.stringify(requestBody),
        authType
      ] })

    const tokenCountRequest = tokenCountResults[0] as any

    try {
      const url = `${modelProviderBaseURL[provider]}${modelAPISpec[provider].countTokens}`

      const headers = constructModelAPIHeaders(requestHeaders)

      const providerResponse = await axios.post(url, requestBody, {
        headers,
        timeout: COUNT_TOKENS_TIMEOUT,
      })

      const responseTimestamp = new Date()
      const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime()
      const inputTokens = providerResponse.data.input_tokens || 0

      await sequelize.query(
        `UPDATE spotlight.token_count_request
         SET response_timestamp = $1, latency_ms = $2, input_tokens = $3,
             response_data = $4, status = 'success', updated_at = CURRENT_TIMESTAMP
         WHERE uuid = $5`,
        { bind: [
          responseTimestamp,
          latencyMs,
          inputTokens,
          JSON.stringify(providerResponse.data),
          tokenCountRequest.uuid
        ] }
      )

      return {
        response: providerResponse.data,
        responseHeaders: providerResponse.headers,
        status: providerResponse.status
      }
    } catch (providerError: any) {
      logger.error({
        message: 'Error counting tokens with provider',
        error: providerError,
        provider,
        userUuid,
        responseStatus: providerError.response?.status,
        responseData: providerError.response?.data,
        responseHeaders: providerError.response?.headers
      })

      // Update token count request with error
      await sequelize.query(
        `UPDATE spotlight.token_count_request
         SET error_message = $1, error_type = $2, status = 'error', updated_at = CURRENT_TIMESTAMP
         WHERE uuid = $3`,
        { bind: [
          providerError.message,
          providerError.response?.data?.error?.type || 'unknown',
          tokenCountRequest.uuid
        ] })

      return {
        response: {
          error: {
            type: 'provider_error',
            message: providerError.response?.data?.error?.message || providerError.message,
          }
        },
        error: true,
        status: providerError.response?.status || 500
      }
    }
  } catch (error: any) {
    logger.error({ message: 'Error in count tokens handler', error })
    return {
      response: { error: { type: 'internal_error', message: 'Internal server error' } },
      error: true,
      status: 500
    }
  }
}

export const handleEventLogging = async (
  shinzoCredentials: ShinzoCredentials,
  provider: string,
  providerCredentials: ProviderCredentials,
  requestHeaders: Record<string, string | string[] | undefined>,
  requestBody: any,
) => {
  try {
    const { apiKeyUuid, userUuid } = shinzoCredentials
    
    const headers = constructModelAPIHeaders(requestHeaders)

    const url = `${modelProviderBaseURL[provider]}${modelAPISpec[provider].eventLogging}`

    const providerResponse = await axios.post(url, requestBody, {
      headers,
      timeout: 30000,
    })

    return {
      response: providerResponse.data,
      responseHeaders: providerResponse.headers,
      status: providerResponse.status
    }
  } catch (providerError: any) {
    logger.error({
      message: 'Error forwarding event logging to provider',
      error: providerError,
      provider,
      responseStatus: providerError.response?.status,
      responseData: providerError.response?.data
    })

    return {
      response: providerError.response?.data || {
        error: {
          type: 'provider_error',
          message: providerError.message,
        }
      },
      error: true,
      status: providerError.response?.status || 500
    }
  }
}

// ============================================================================
// Analytics Endpoints (Keep existing implementations)
// ============================================================================

export const handleFetchTokenAnalytics = async (
  userUuid: string,
  filters: yup.InferType<typeof fetchAnalyticsSchema> = {}
) => {
  try {
    const where: any = { user_uuid: userUuid, status: 'success' }

    if (filters.start_date) {
      where.request_timestamp = { ...where.request_timestamp, [Op.gte]: filters.start_date }
    }
    if (filters.end_date) {
      where.request_timestamp = { ...where.request_timestamp, [Op.lte]: filters.end_date }
    }
    if (filters.model) {
      where.model = filters.model
    }
    if (filters.provider) {
      where.provider = filters.provider
    }

    const interactions = await Interaction.findAll({
      where,
      attributes: [
        'model',
        'provider',
        'input_tokens',
        'output_tokens',
        'cache_read_input_tokens',
        'cache_creation_ephemeral_5m_input_tokens',
        'cache_creation_ephemeral_1h_input_tokens',
      ],
      raw: true,
    })

    // Calculate aggregations
    const totalInputTokens = interactions.reduce((sum, i: any) => sum + (i.input_tokens || 0), 0)
    const totalOutputTokens = interactions.reduce((sum, i: any) => sum + (i.output_tokens || 0), 0)
    const totalCachedTokens = interactions.reduce((sum, i: any) => sum + (i.cache_read_input_tokens || 0), 0)
    const totalCacheCreation5mTokens = interactions.reduce((sum, i: any) => sum + (i.cache_creation_ephemeral_5m_input_tokens || 0), 0)
    const totalCacheCreation1hTokens = interactions.reduce((sum, i: any) => sum + (i.cache_creation_ephemeral_1h_input_tokens || 0), 0)

    // Group by model
    const byModel: Record<string, any> = {}
    for (const interaction of interactions as any[]) {
      const model = interaction.model
      if (!byModel[model]) {
        byModel[model] = {
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
          cache_creation_5m_tokens: 0,
          cache_creation_1h_tokens: 0,
          request_count: 0,
        }
      }
      byModel[model].input_tokens += interaction.input_tokens || 0
      byModel[model].output_tokens += interaction.output_tokens || 0
      byModel[model].cached_tokens += interaction.cache_read_input_tokens || 0
      byModel[model].cache_creation_5m_tokens += interaction.cache_creation_ephemeral_5m_input_tokens || 0
      byModel[model].cache_creation_1h_tokens += interaction.cache_creation_ephemeral_1h_input_tokens || 0
      byModel[model].request_count += 1
    }

    return {
      response: {
        summary: {
          total_input_tokens: totalInputTokens,
          total_output_tokens: totalOutputTokens,
          total_cached_tokens: totalCachedTokens,
          total_cache_creation_5m_tokens: totalCacheCreation5mTokens,
          total_cache_creation_1h_tokens: totalCacheCreation1hTokens,
          total_requests: interactions.length,
        },
        by_model: byModel,
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching token analytics', error, userUuid })
    return {
      response: 'Error fetching token analytics',
      error: true,
      status: 500
    }
  }
}


export const handleFetchSessionAnalytics = async (
  userUuid: string,
  filters: yup.InferType<typeof fetchAnalyticsSchema> = {}
) => {
  try {
    const where: any = { user_uuid: userUuid }

    if (filters.session_id) {
      where.session_id = filters.session_id
    }

    const sessions = await Session.findAll({
      where,
      include: [
        {
          model: Interaction,
          as: 'interactions',
          required: false,
        }
      ],
      order: [['start_time', 'DESC']],
      limit: 100,
    })

    const getLastMessagePreview = (interactions: any[]): string => {
      if (!interactions || interactions.length === 0) return 'No messages'

      // Sort by request_timestamp to get the last interaction
      const sortedInteractions = [...interactions].sort((a, b) =>
        new Date(b.request_timestamp).getTime() - new Date(a.request_timestamp).getTime()
      )
      const lastInteraction = sortedInteractions[0]

      // Try to get response content first, fallback to request
      let messageContent = ''

      if (lastInteraction.response_data?.content) {
        const content = lastInteraction.response_data.content
        if (typeof content === 'string') {
          messageContent = content
        } else if (Array.isArray(content)) {
          const textBlock = content.find((block: any) => block.type === 'text')
          if (textBlock?.text) {
            messageContent = textBlock.text
          }
        }
      }

      // Fallback to request if no response
      if (!messageContent && lastInteraction.request_data?.messages) {
        const messages = lastInteraction.request_data.messages
        if (Array.isArray(messages) && messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          if (typeof lastMessage.content === 'string') {
            messageContent = lastMessage.content
          } else if (Array.isArray(lastMessage.content)) {
            const textBlock = lastMessage.content.find((block: any) => block.type === 'text')
            if (textBlock?.text) {
              messageContent = textBlock.text
            }
          }
        }
      }

      // Truncate to 100 characters
      if (messageContent.length > 100) {
        return messageContent.substring(0, 100) + '...'
      }
      return messageContent || 'No text content'
    }

    // Fetch or create shareToken for each session
    const sessionsWithShareTokens = await Promise.all(
      sessions.map(async (session) => {
        // Check if shareToken exists
        const [shareResults] = await sequelize.query(
          `SELECT share_token FROM spotlight.session_share WHERE session_uuid = $1`,
          { bind: [session.uuid] }
        )

        let shareToken: string
        if (shareResults && (shareResults as any).length > 0) {
          shareToken = (shareResults as any)[0].share_token
        } else {
          // Create new shareToken with sharing disabled by default
          shareToken = generateShareToken()
          await sequelize.query(
            `INSERT INTO spotlight.session_share (session_uuid, user_uuid, share_token, is_active)
             VALUES ($1, $2, $3, false)
             ON CONFLICT (session_uuid) DO NOTHING`,
            { bind: [session.uuid, userUuid, shareToken] }
          )

          // Re-query to get the actual shareToken (in case of conflict)
          const [refetchResults] = await sequelize.query(
            `SELECT share_token FROM spotlight.session_share WHERE session_uuid = $1`,
            { bind: [session.uuid] }
          )
          if (refetchResults && (refetchResults as any).length > 0) {
            shareToken = (refetchResults as any)[0].share_token
          }
        }

        return {
          uuid: session.uuid,
          session_id: session.session_id,
          start_time: session.start_time,
          end_time: session.end_time,
          total_requests: session.total_requests,
          total_input_tokens: session.total_input_tokens,
          total_output_tokens: session.total_output_tokens,
          total_cache_read_input_tokens: (session as any).interactions?.reduce((sum: number, interaction: any) => sum + (interaction.cache_read_input_tokens || 0), 0) || 0,
          total_cache_creation_ephemeral_5m_input_tokens: session.total_cache_creation_ephemeral_5m_input_tokens,
          total_cache_creation_ephemeral_1h_input_tokens: session.total_cache_creation_ephemeral_1h_input_tokens,
          interaction_count: (session as any).interactions?.length || 0,
          last_message_preview: getLastMessagePreview((session as any).interactions || []),
          share_token: shareToken,
        }
      })
    )

    return {
      response: {
        sessions: sessionsWithShareTokens,
        total_sessions: sessions.length,
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching session analytics', error, userUuid })
    return {
      response: 'Error fetching session analytics',
      error: true,
      status: 500
    }
  }
}

export const handleFetchSessionDetail = async (userUuid: string, sessionUuid: string) => {
  try {
    logger.debug({ message: 'Fetching session detail', userUuid, sessionUuid })

    const session = await Session.findOne({
      where: { uuid: sessionUuid, user_uuid: userUuid },
      include: [
        {
          model: Interaction,
          as: 'interactions',
          include: [
            {
              model: ToolUsage,
              as: 'toolUsages',
            }
          ],
          separate: true,
          order: [['request_timestamp', 'DESC']],
        }
      ]
    })

    logger.debug({ message: 'Session query result', session: session ? 'found' : 'not found', interactionCount: session ? (session as any).interactions?.length : 0 })

    if (!session) {
      logger.warn({ message: 'Session not found', userUuid, sessionUuid })
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    const response = {
      session: {
        uuid: session.uuid,
        session_id: session.session_id,
        start_time: session.start_time,
        end_time: session.end_time,
        total_requests: session.total_requests,
        total_input_tokens: session.total_input_tokens,
        total_output_tokens: session.total_output_tokens,
        total_cache_read_input_tokens: (session as any).interactions?.reduce((sum: number, interaction: any) => sum + (interaction.cache_read_input_tokens || 0), 0) || 0,
        total_cache_creation_ephemeral_5m_input_tokens: session.total_cache_creation_ephemeral_5m_input_tokens,
        total_cache_creation_ephemeral_1h_input_tokens: session.total_cache_creation_ephemeral_1h_input_tokens,
      },
      interactions: (session as any).interactions?.map((interaction: any) => ({
        uuid: interaction.uuid,
        request_timestamp: interaction.request_timestamp,
        response_timestamp: interaction.response_timestamp,
        model: interaction.model,
        provider: interaction.provider,
        input_tokens: interaction.input_tokens || 0,
        output_tokens: interaction.output_tokens || 0,
        cache_read_input_tokens: interaction.cache_read_input_tokens || 0,
        cache_creation_ephemeral_5m_input_tokens: interaction.cache_creation_ephemeral_5m_input_tokens || 0,
        cache_creation_ephemeral_1h_input_tokens: interaction.cache_creation_ephemeral_1h_input_tokens || 0,
        latency_ms: interaction.latency_ms || 0,
        status: interaction.status,
        error_type: interaction.error_type,
        error_message: interaction.error_message,
        request_data: interaction.request_data,
        response_data: interaction.response_data,
        tool_usages: interaction.toolUsages?.map((tu: any) => ({
          tool_name: tu.tool_name,
          tool_input: tu.tool_input,
          tool_output: tu.tool_output,
        })) || [],
      })) || [],
    }

    logger.debug({ message: 'Session detail response prepared', sessionUuid, interactionCount: response.interactions.length })

    return {
      response,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching session detail', error, userUuid, sessionUuid })
    return {
      response: 'Error fetching session detail',
      error: true,
      status: 500
    }
  }
}

export const handleFetchSessionDetailByShareToken = async (userUuid: string, shareToken: string) => {
  try {
    logger.debug({ message: 'Fetching session detail by share token', userUuid, shareToken })

    // Get session UUID from share token
    const [shareResults] = await sequelize.query(
      `SELECT session_uuid, is_active, user_uuid as owner_uuid
       FROM spotlight.session_share
       WHERE share_token = $1`,
      { bind: [shareToken] }
    )

    if (!shareResults || (shareResults as any).length === 0) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    const share = (shareResults as any)[0]

    // Fetch session details
    const session = await Session.findOne({
      where: { uuid: share.session_uuid },
      include: [
        {
          model: Interaction,
          as: 'interactions',
          include: [
            {
              model: ToolUsage,
              as: 'toolUsages',
            }
          ],
          separate: true,
          order: [['request_timestamp', 'DESC']],
        }
      ]
    })

    if (!session) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    const isOwner = session.user_uuid === userUuid

    // Non-owners can only access if sharing is active
    if (!isOwner && !share.is_active) {
      return {
        response: 'This shared session is no longer available',
        error: true,
        status: 403
      }
    }

    const response = {
      session: {
        uuid: session.uuid,
        session_id: session.session_id,
        start_time: session.start_time,
        end_time: session.end_time,
        total_requests: session.total_requests,
        total_input_tokens: session.total_input_tokens,
        total_output_tokens: session.total_output_tokens,
        total_cache_read_input_tokens: (session as any).interactions?.reduce((sum: number, interaction: any) => sum + (interaction.cache_read_input_tokens || 0), 0) || 0,
        total_cache_creation_ephemeral_5m_input_tokens: session.total_cache_creation_ephemeral_5m_input_tokens,
        total_cache_creation_ephemeral_1h_input_tokens: session.total_cache_creation_ephemeral_1h_input_tokens,
      },
      interactions: (session as any).interactions?.map((interaction: any) => ({
        uuid: interaction.uuid,
        request_timestamp: interaction.request_timestamp,
        response_timestamp: interaction.response_timestamp,
        model: interaction.model,
        provider: interaction.provider,
        input_tokens: interaction.input_tokens || 0,
        output_tokens: interaction.output_tokens || 0,
        cache_read_input_tokens: interaction.cache_read_input_tokens || 0,
        cache_creation_ephemeral_5m_input_tokens: interaction.cache_creation_ephemeral_5m_input_tokens || 0,
        cache_creation_ephemeral_1h_input_tokens: interaction.cache_creation_ephemeral_1h_input_tokens || 0,
        latency_ms: interaction.latency_ms || 0,
        status: interaction.status,
        error_type: interaction.error_type,
        error_message: interaction.error_message,
        request_data: interaction.request_data,
        response_data: interaction.response_data,
        tool_usages: interaction.toolUsages?.map((tu: any) => ({
          tool_name: tu.tool_name,
          tool_input: tu.tool_input,
          tool_output: tu.tool_output,
        })) || [],
      })) || [],
      is_owner: isOwner,
      share_token: shareToken,
      is_share_active: share.is_active,
    }

    return {
      response,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching session detail by share token', error, userUuid, shareToken })
    return {
      response: 'Error fetching session detail',
      error: true,
      status: 500
    }
  }
}

// ============================================================================
// Session Sharing Endpoints
// ============================================================================

const generateShareToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export const handleCreateSessionShare = async (userUuid: string, sessionUuid: string) => {
  try {
    // Verify session exists and belongs to user
    const session = await Session.findOne({
      where: { uuid: sessionUuid, user_uuid: userUuid }
    })

    if (!session) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    // Check if share already exists
    const [existingShare] = await sequelize.query(
      `SELECT uuid, share_token, is_active FROM spotlight.session_share
       WHERE session_uuid = $1`,
      { bind: [sessionUuid] }
    )

    if (existingShare && (existingShare as any).length > 0) {
      const share = (existingShare as any)[0]
      // If share exists but is inactive, reactivate it
      if (!share.is_active) {
        await sequelize.query(
          `UPDATE spotlight.session_share
           SET is_active = true, updated_at = CURRENT_TIMESTAMP
           WHERE uuid = $1`,
          { bind: [share.uuid] }
        )
      }
      return {
        response: {
          share_token: share.share_token,
          is_active: true
        },
        status: 200
      }
    }

    // Create new share
    const shareToken = generateShareToken()
    const [results] = await sequelize.query(
      `INSERT INTO spotlight.session_share (session_uuid, user_uuid, share_token, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING uuid, share_token, is_active, created_at`,
      { bind: [sessionUuid, userUuid, shareToken] }
    )

    const newShare = (results as any)[0]

    logger.info({ message: 'Session share created', userUuid, sessionUuid, shareUuid: newShare.uuid })

    return {
      response: {
        share_token: newShare.share_token,
        is_active: newShare.is_active,
        created_at: newShare.created_at
      },
      status: 201
    }
  } catch (error) {
    logger.error({ message: 'Error creating session share', error, userUuid, sessionUuid })
    return {
      response: 'Error creating session share',
      error: true,
      status: 500
    }
  }
}

export const handleDeleteSessionShare = async (userUuid: string, sessionUuid: string) => {
  try {
    // Verify session exists and belongs to user
    const session = await Session.findOne({
      where: { uuid: sessionUuid, user_uuid: userUuid }
    })

    if (!session) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    // Deactivate the share
    const [results] = await sequelize.query(
      `UPDATE spotlight.session_share
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE session_uuid = $1 AND user_uuid = $2
       RETURNING uuid`,
      { bind: [sessionUuid, userUuid] }
    )

    if (!results || (results as any).length === 0) {
      return {
        response: 'Session share not found',
        error: true,
        status: 404
      }
    }

    logger.info({ message: 'Session share deactivated', userUuid, sessionUuid })

    return {
      response: { message: 'Session share deactivated' },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error deleting session share', error, userUuid, sessionUuid })
    return {
      response: 'Error deleting session share',
      error: true,
      status: 500
    }
  }
}

export const handleGetSessionShareStatus = async (userUuid: string, sessionUuid: string) => {
  try {
    // Verify session exists and belongs to user
    const session = await Session.findOne({
      where: { uuid: sessionUuid, user_uuid: userUuid }
    })

    if (!session) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    const [results] = await sequelize.query(
      `SELECT share_token, is_active, created_at
       FROM spotlight.session_share
       WHERE session_uuid = $1`,
      { bind: [sessionUuid] }
    )

    if (!results || (results as any).length === 0) {
      return {
        response: { is_shared: false },
        status: 200
      }
    }

    const share = (results as any)[0]

    return {
      response: {
        is_shared: share.is_active,
        share_token: share.is_active ? share.share_token : null,
        created_at: share.created_at
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching session share status', error, userUuid, sessionUuid })
    return {
      response: 'Error fetching session share status',
      error: true,
      status: 500
    }
  }
}

export const handleFetchSharedSessionDetail = async (shareToken: string) => {
  try {
    // Get session UUID from share token
    const [shareResults] = await sequelize.query(
      `SELECT session_uuid, is_active
       FROM spotlight.session_share
       WHERE share_token = $1`,
      { bind: [shareToken] }
    )

    if (!shareResults || (shareResults as any).length === 0) {
      return {
        response: 'Shared session not found',
        error: true,
        status: 404
      }
    }

    const share = (shareResults as any)[0]

    if (!share.is_active) {
      return {
        response: 'This shared session is no longer available',
        error: true,
        status: 403
      }
    }

    // Fetch session details (without user UUID check since it's a shared session)
    const session = await Session.findOne({
      where: { uuid: share.session_uuid },
      include: [
        {
          model: Interaction,
          as: 'interactions',
          include: [
            {
              model: ToolUsage,
              as: 'toolUsages',
            }
          ],
          separate: true,
          order: [['request_timestamp', 'DESC']],
        }
      ]
    })

    if (!session) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    const response = {
      session: {
        uuid: session.uuid,
        session_id: session.session_id,
        start_time: session.start_time,
        end_time: session.end_time,
        total_requests: session.total_requests,
        total_input_tokens: session.total_input_tokens,
        total_output_tokens: session.total_output_tokens,
        total_cache_read_input_tokens: (session as any).interactions?.reduce((sum: number, interaction: any) => sum + (interaction.cache_read_input_tokens || 0), 0) || 0,
        total_cache_creation_ephemeral_5m_input_tokens: session.total_cache_creation_ephemeral_5m_input_tokens,
        total_cache_creation_ephemeral_1h_input_tokens: session.total_cache_creation_ephemeral_1h_input_tokens,
      },
      interactions: (session as any).interactions?.map((interaction: any) => ({
        uuid: interaction.uuid,
        request_timestamp: interaction.request_timestamp,
        response_timestamp: interaction.response_timestamp,
        model: interaction.model,
        provider: interaction.provider,
        input_tokens: interaction.input_tokens || 0,
        output_tokens: interaction.output_tokens || 0,
        cache_read_input_tokens: interaction.cache_read_input_tokens || 0,
        cache_creation_ephemeral_5m_input_tokens: interaction.cache_creation_ephemeral_5m_input_tokens || 0,
        cache_creation_ephemeral_1h_input_tokens: interaction.cache_creation_ephemeral_1h_input_tokens || 0,
        latency_ms: interaction.latency_ms || 0,
        status: interaction.status,
        error_type: interaction.error_type,
        error_message: interaction.error_message,
        request_data: interaction.request_data,
        response_data: interaction.response_data,
        tool_usages: interaction.toolUsages?.map((tu: any) => ({
          tool_name: tu.tool_name,
          tool_input: tu.tool_input,
          tool_output: tu.tool_output,
        })) || [],
      })) || [],
      is_shared: true
    }

    return {
      response,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching shared session detail', error, shareToken })
    return {
      response: 'Error fetching shared session detail',
      error: true,
      status: 500
    }
  }
}

