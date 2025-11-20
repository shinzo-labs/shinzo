import * as yup from 'yup'
import { ApiKey, Session, Interaction, Tool, ToolUsage, UserAnalytics } from '../models'
import { logger } from '../logger'
import * as crypto from 'crypto'
import { Op } from 'sequelize'
import axios from 'axios'

// Schema definitions
export const createApiKeySchema = yup.object({
  key_name: yup.string().required('Key name is required'),
  provider: yup.string().oneOf(['anthropic', 'openai', 'google', 'custom']).required('Provider is required'),
  provider_api_key: yup.string().required('Provider API key is required'),
  provider_base_url: yup.string().url().nullable(),
}).required()

export const updateApiKeySchema = yup.object({
  key_name: yup.string().optional(),
  provider_api_key: yup.string().optional(),
  provider_base_url: yup.string().url().nullable(),
  status: yup.string().oneOf(['active', 'inactive']).optional(),
}).required()

export const fetchAnalyticsSchema = yup.object({
  start_date: yup.date().optional(),
  end_date: yup.date().optional(),
  session_id: yup.string().optional(),
  model: yup.string().optional(),
  provider: yup.string().optional(),
}).optional()

// Helper function to generate API key
function generateApiKey(): string {
  return 'sk-shinzo-' + crypto.randomBytes(32).toString('hex')
}

// Helper function to get provider base URL
function getProviderBaseUrl(provider: string): string {
  const baseUrls: Record<string, string> = {
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com',
    google: 'https://generativelanguage.googleapis.com',
  }
  return baseUrls[provider] || ''
}

// API Key CRUD operations
export const handleCreateApiKey = async (userUuid: string, request: yup.InferType<typeof createApiKeySchema>) => {
  try {
    const apiKey = generateApiKey()

    const newKey = await ApiKey.create({
      user_uuid: userUuid,
      key_name: request.key_name,
      api_key: apiKey,
      provider: request.provider,
      provider_api_key: request.provider_api_key,
      provider_base_url: request.provider_base_url || getProviderBaseUrl(request.provider),
      status: 'active',
    })

    logger.info({ message: 'API key created successfully', userUuid, keyUuid: newKey.uuid })

    return {
      response: {
        uuid: newKey.uuid,
        key_name: newKey.key_name,
        api_key: newKey.api_key,
        provider: newKey.provider,
        provider_base_url: newKey.provider_base_url,
        status: newKey.status,
        created_at: newKey.created_at,
      },
      status: 201
    }
  } catch (error) {
    logger.error({ message: 'Error creating API key', error, userUuid })
    return {
      response: 'Error creating API key',
      error: true,
      status: 500
    }
  }
}

export const handleFetchApiKeys = async (userUuid: string) => {
  try {
    const apiKeys = await ApiKey.findAll({
      where: { user_uuid: userUuid },
      order: [['created_at', 'DESC']]
    })

    return {
      response: {
        api_keys: apiKeys.map(key => ({
          uuid: key.uuid,
          key_name: key.key_name,
          api_key: key.api_key,
          provider: key.provider,
          provider_base_url: key.provider_base_url,
          status: key.status,
          last_used: key.last_used,
          created_at: key.created_at,
        }))
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching API keys', error, userUuid })
    return {
      response: 'Error fetching API keys',
      error: true,
      status: 500
    }
  }
}

export const handleUpdateApiKey = async (
  userUuid: string,
  keyUuid: string,
  request: yup.InferType<typeof updateApiKeySchema>
) => {
  try {
    const apiKey = await ApiKey.findOne({
      where: { uuid: keyUuid, user_uuid: userUuid }
    })

    if (!apiKey) {
      return {
        response: 'API key not found',
        error: true,
        status: 404
      }
    }

    await apiKey.update(request)

    logger.info({ message: 'API key updated successfully', userUuid, keyUuid })

    return {
      response: {
        uuid: apiKey.uuid,
        key_name: apiKey.key_name,
        provider: apiKey.provider,
        provider_base_url: apiKey.provider_base_url,
        status: apiKey.status,
        updated_at: apiKey.updated_at,
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error updating API key', error, userUuid, keyUuid })
    return {
      response: 'Error updating API key',
      error: true,
      status: 500
    }
  }
}

export const handleDeleteApiKey = async (userUuid: string, keyUuid: string) => {
  try {
    const apiKey = await ApiKey.findOne({
      where: { uuid: keyUuid, user_uuid: userUuid }
    })

    if (!apiKey) {
      return {
        response: 'API key not found',
        error: true,
        status: 404
      }
    }

    await apiKey.destroy()

    logger.info({ message: 'API key deleted successfully', userUuid, keyUuid })

    return {
      response: { message: 'API key deleted successfully' },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error deleting API key', error, userUuid, keyUuid })
    return {
      response: 'Error deleting API key',
      error: true,
      status: 500
    }
  }
}

// Model Proxy Handler
export const handleModelProxy = async (apiKey: string, requestBody: any) => {
  try {
    const key = await ApiKey.findOne({
      where: { api_key: apiKey, status: 'active' }
    })

    if (!key) {
      return {
        response: 'Invalid or inactive API key',
        error: true,
        status: 401
      }
    }

    // Update last_used timestamp
    await key.update({ last_used: new Date() })

    const requestTimestamp = new Date()
    const sessionId = requestBody.metadata?.user_id || 'default-session'

    // Get or create session
    let session = await Session.findOne({
      where: {
        user_uuid: key.user_uuid,
        api_key_uuid: key.uuid,
        session_id: sessionId,
        end_time: null,
      }
    })

    if (!session) {
      session = await Session.create({
        user_uuid: key.user_uuid,
        api_key_uuid: key.uuid,
        session_id: sessionId,
        start_time: requestTimestamp,
      })
    }

    // Create interaction record
    const interaction = await Interaction.create({
      session_uuid: session.uuid,
      user_uuid: key.user_uuid,
      api_key_uuid: key.uuid,
      request_timestamp: requestTimestamp,
      model: requestBody.model || 'unknown',
      provider: key.provider,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature,
      system_prompt: requestBody.system || null,
      request_data: requestBody,
      status: 'pending',
    })

    // Forward request to provider
    let providerResponse
    try {
      const endpoint = key.provider === 'anthropic' ? '/v1/messages' : '/v1/chat/completions'
      const url = `${key.provider_base_url}${endpoint}`

      logger.info({ message: 'Proxying request to provider', provider: key.provider, url })

      providerResponse = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key.provider_api_key, // Anthropic
          'Authorization': `Bearer ${key.provider_api_key}`, // OpenAI
          'anthropic-version': '2023-06-01',
        },
        timeout: 120000, // 2 minute timeout
      })

      const responseTimestamp = new Date()
      const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime()

      // Extract usage data from response
      const usage = providerResponse.data.usage || {}
      const inputTokens = usage.input_tokens || 0
      const outputTokens = usage.output_tokens || 0
      const cacheCreationTokens = usage.cache_creation_input_tokens || 0
      const cacheReadTokens = usage.cache_read_input_tokens || 0

      // Update interaction with response
      await interaction.update({
        response_timestamp: responseTimestamp,
        response_id: providerResponse.data.id,
        stop_reason: providerResponse.data.stop_reason,
        latency_ms: latencyMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: cacheCreationTokens,
        cache_read_input_tokens: cacheReadTokens,
        response_data: providerResponse.data,
        status: 'success',
      })

      // Update session totals
      await session.update({
        total_requests: session.total_requests + 1,
        total_input_tokens: session.total_input_tokens + inputTokens,
        total_output_tokens: session.total_output_tokens + outputTokens,
        total_cached_tokens: session.total_cached_tokens + cacheReadTokens,
      })

      // Track tool usage if present
      if (requestBody.tools && Array.isArray(requestBody.tools)) {
        for (const toolDef of requestBody.tools) {
          let tool = await Tool.findOne({
            where: {
              user_uuid: key.user_uuid,
              tool_name: toolDef.name,
            }
          })

          if (!tool) {
            tool = await Tool.create({
              user_uuid: key.user_uuid,
              tool_name: toolDef.name,
              description: toolDef.description,
              input_schema: toolDef.input_schema,
              first_seen: new Date(),
              last_seen: new Date(),
            })
          } else {
            await tool.update({ last_seen: new Date() })
          }
        }
      }

      // Track tool calls in response
      if (providerResponse.data.content && Array.isArray(providerResponse.data.content)) {
        for (const content of providerResponse.data.content) {
          if (content.type === 'tool_use') {
            let tool = await Tool.findOne({
              where: {
                user_uuid: key.user_uuid,
                tool_name: content.name,
              }
            })

            if (tool) {
              await tool.update({
                total_calls: tool.total_calls + 1,
                last_seen: new Date(),
              })

              await ToolUsage.create({
                interaction_uuid: interaction.uuid,
                tool_uuid: tool.uuid,
                tool_name: content.name,
                tool_input: content.input,
                tool_output: null,
              })
            }
          }
        }
      }

      // Update user analytics
      const endUserId = requestBody.metadata?.user_id || 'anonymous'
      let userAnalytics = await UserAnalytics.findOne({
        where: {
          user_uuid: key.user_uuid,
          end_user_id: endUserId,
        }
      })

      if (!userAnalytics) {
        userAnalytics = await UserAnalytics.create({
          user_uuid: key.user_uuid,
          end_user_id: endUserId,
          total_requests: 1,
          total_input_tokens: inputTokens,
          total_output_tokens: outputTokens,
          total_cached_tokens: cacheReadTokens,
          first_request: requestTimestamp,
          last_request: responseTimestamp,
        })
      } else {
        await userAnalytics.update({
          total_requests: userAnalytics.total_requests + 1,
          total_input_tokens: userAnalytics.total_input_tokens + inputTokens,
          total_output_tokens: userAnalytics.total_output_tokens + outputTokens,
          total_cached_tokens: userAnalytics.total_cached_tokens + cacheReadTokens,
          last_request: responseTimestamp,
        })
      }

      return {
        response: providerResponse.data,
        status: providerResponse.status
      }
    } catch (providerError: any) {
      logger.error({ message: 'Error proxying to provider', error: providerError, provider: key.provider })

      // Update interaction with error
      await interaction.update({
        error_message: providerError.message,
        error_type: providerError.response?.data?.error?.type || 'unknown',
        status: 'error',
      })

      return {
        response: {
          error: {
            type: 'provider_error',
            message: providerError.message,
          }
        },
        error: true,
        status: providerError.response?.status || 500
      }
    }
  } catch (error: any) {
    logger.error({ message: 'Error in model proxy handler', error })
    return {
      response: 'Internal server error',
      error: true,
      status: 500
    }
  }
}

// Analytics Endpoints
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
      ],
      raw: true,
    })

    // Calculate aggregations
    const totalInputTokens = interactions.reduce((sum, i: any) => sum + (i.input_tokens || 0), 0)
    const totalOutputTokens = interactions.reduce((sum, i: any) => sum + (i.output_tokens || 0), 0)
    const totalCachedTokens = interactions.reduce((sum, i: any) => sum + (i.cache_read_input_tokens || 0), 0)
    const totalCacheCreationTokens = interactions.reduce((sum, i: any) => sum + (i.cache_creation_input_tokens || 0), 0)

    // Group by model
    const byModel: Record<string, any> = {}
    for (const interaction of interactions as any[]) {
      const model = interaction.model
      if (!byModel[model]) {
        byModel[model] = {
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
          cache_creation_tokens: 0,
          request_count: 0,
        }
      }
      byModel[model].input_tokens += interaction.input_tokens || 0
      byModel[model].output_tokens += interaction.output_tokens || 0
      byModel[model].cached_tokens += interaction.cache_read_input_tokens || 0
      byModel[model].cache_creation_tokens += interaction.cache_creation_input_tokens || 0
      byModel[model].request_count += 1
    }

    return {
      response: {
        summary: {
          total_input_tokens: totalInputTokens,
          total_output_tokens: totalOutputTokens,
          total_cached_tokens: totalCachedTokens,
          total_cache_creation_tokens: totalCacheCreationTokens,
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

export const handleFetchToolAnalytics = async (
  userUuid: string,
  filters: yup.InferType<typeof fetchAnalyticsSchema> = {}
) => {
  try {
    const tools = await Tool.findAll({
      where: { user_uuid: userUuid },
      include: [
        {
          model: ToolUsage,
          as: 'usages',
          required: false,
        }
      ],
      order: [['total_calls', 'DESC']]
    })

    const toolStats = tools.map(tool => ({
      tool_name: tool.tool_name,
      description: tool.description,
      total_calls: tool.total_calls,
      total_input_tokens: tool.total_input_tokens,
      total_output_tokens: tool.total_output_tokens,
      first_seen: tool.first_seen,
      last_seen: tool.last_seen,
    }))

    return {
      response: {
        tools: toolStats,
        total_unique_tools: tools.length,
        total_tool_calls: tools.reduce((sum, t) => sum + t.total_calls, 0),
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching tool analytics', error, userUuid })
    return {
      response: 'Error fetching tool analytics',
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

    return {
      response: {
        sessions: sessions.map(session => ({
          uuid: session.uuid,
          session_id: session.session_id,
          start_time: session.start_time,
          end_time: session.end_time,
          total_requests: session.total_requests,
          total_input_tokens: session.total_input_tokens,
          total_output_tokens: session.total_output_tokens,
          total_cached_tokens: session.total_cached_tokens,
          interaction_count: (session as any).interactions?.length || 0,
        })),
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
          order: [['request_timestamp', 'ASC']],
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

    return {
      response: {
        session: {
          uuid: session.uuid,
          session_id: session.session_id,
          start_time: session.start_time,
          end_time: session.end_time,
          total_requests: session.total_requests,
          total_input_tokens: session.total_input_tokens,
          total_output_tokens: session.total_output_tokens,
          total_cached_tokens: session.total_cached_tokens,
        },
        interactions: (session as any).interactions.map((interaction: any) => ({
          uuid: interaction.uuid,
          request_timestamp: interaction.request_timestamp,
          response_timestamp: interaction.response_timestamp,
          model: interaction.model,
          provider: interaction.provider,
          input_tokens: interaction.input_tokens,
          output_tokens: interaction.output_tokens,
          cache_read_input_tokens: interaction.cache_read_input_tokens,
          cache_creation_input_tokens: interaction.cache_creation_input_tokens,
          latency_ms: interaction.latency_ms,
          status: interaction.status,
          request_data: interaction.request_data,
          response_data: interaction.response_data,
          tool_usages: interaction.toolUsages.map((tu: any) => ({
            tool_name: tu.tool_name,
            tool_input: tu.tool_input,
            tool_output: tu.tool_output,
          })),
        })),
      },
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

export const handleFetchUserAnalytics = async (
  userUuid: string,
  filters: yup.InferType<typeof fetchAnalyticsSchema> = {}
) => {
  try {
    const userAnalytics = await UserAnalytics.findAll({
      where: { user_uuid: userUuid },
      order: [['total_requests', 'DESC']],
    })

    return {
      response: {
        users: userAnalytics.map(ua => ({
          end_user_id: ua.end_user_id,
          total_requests: ua.total_requests,
          total_input_tokens: ua.total_input_tokens,
          total_output_tokens: ua.total_output_tokens,
          total_cached_tokens: ua.total_cached_tokens,
          first_request: ua.first_request,
          last_request: ua.last_request,
        })),
        total_unique_users: userAnalytics.length,
        total_requests: userAnalytics.reduce((sum, ua) => sum + ua.total_requests, 0),
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching user analytics', error, userUuid })
    return {
      response: 'Error fetching user analytics',
      error: true,
      status: 500
    }
  }
}
