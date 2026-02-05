import { API_BASE_URL } from './config'
import { streamClaudeRequest, SSEEventHandler, MessageCompleteHandler, SSEErrorHandler, MessageState } from './utils/sseClient'

interface User {
  uuid: string
  email: string
  verified: boolean
  created_at?: string
  updated_at?: string
}

interface AuthResponse {
  token: string
  user: User
}

interface CreateUserRequest {
  email: string
  password: string
}

interface CreateUserResponse {
  message: string
  uuid: string
  email: string
  verification_token: string
}

interface LoginRequest {
  email: string
  password: string
}

interface VerifyUserRequest {
  email: string
  verification_token: string
}

interface VerifyUserResponse {
  message: string
  verified: boolean
}

interface IngestToken {
  uuid: string
  ingest_token: string
  status: 'live' | 'deprecated'
  created_at: string
  updated_at: string
}

interface Resource {
  uuid: string
  service_name: string
  attributes: Record<string, any>
  created_at: string
}

interface Trace {
  uuid: string
  start_time: string
  end_time: string | null
  service_name: string
  operation_name: string | null
  status: string | null
  span_count: number
  duration_ms: number | null
}

interface Span {
  uuid: string
  trace_uuid: string
  parent_span_uuid: string | null
  start_time: string
  end_time: string | null
  service_name: string
  operation_name: string | null
  status_code: number | null
  status_message: string | null
  span_kind: string | null
  duration_ms: number | null
}

interface Metric {
  uuid: string
  name: string
  description: string | null
  unit: string | null
  metric_type: string
  timestamp: string
  value: number
  scope_name: string | null
  scope_version: string | null
  created_at: string
  updated_at: string
  attributes: Array<{
    key: string
    value: string
  }>
}

interface TelemetryQueryParams {
  start_time: string
  end_time: string
  limit?: number
  offset?: number
  sort?: string
  sortDirection?: 'asc' | 'desc'
  service_name?: string
  status?: string
}

interface PaginatedResponse<T> {
  data: T[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

interface TracesResponse {
  traces: Trace[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

interface SpansResponse {
  spans: Span[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

interface UserQuota {
  currentUsage: number
  monthlyQuota: number | null
  tier: 'free' | 'growth' | 'scale'
  lastCounterReset: string
  subscribedOn: string | null
}

const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
})

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `HTTP ${response.status}`)
  }
  return response.json()
}

export const healthService = {
  async check(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`)
    return handleResponse(response)
  }
}

export const authService = {
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/create_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    return handleResponse(response)
  },

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    return handleResponse(response)
  },

  async verifyUser(verificationData: VerifyUserRequest): Promise<VerifyUserResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/verify_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationData)
    })
    return handleResponse(response)
  },

  async fetchUser(token: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/fetch_user`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchUserQuota(token: string): Promise<UserQuota> {
    const response = await fetch(`${API_BASE_URL}/auth/fetch_user_quota`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  }
}

interface OAuthAccount {
  uuid: string
  oauth_provider: 'google' | 'github'
  oauth_email: string | null
  linked_at: string
  created_at: string
}

interface AuthMethods {
  hasPassword: boolean
  oauthProviders: string[]
}

export const oauthAccountService = {
  async fetchAuthMethods(token: string): Promise<AuthMethods> {
    const response = await fetch(`${API_BASE_URL}/auth/methods`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchOAuthAccounts(token: string): Promise<{ accounts: OAuthAccount[] }> {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/accounts`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async unlinkOAuthProvider(token: string, provider: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/accounts/${provider}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  }
}

export const ingestTokenService = {
  async generate(token: string): Promise<{ token: string; uuid: string; status: string; created_at: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/generate_ingest_token`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({})
    })
    return handleResponse(response)
  },

  async fetchAll(token: string): Promise<IngestToken[]> {
    const response = await fetch(`${API_BASE_URL}/auth/fetch_ingest_tokens`, {
      headers: getAuthHeaders(token)
    })
    const result = await handleResponse(response)
    return result.tokens || []
  },

  async revoke(token: string, tokenUuid: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/revoke_ingest_token/${tokenUuid}`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({})
    })
    return handleResponse(response)
  }
}

export type {
  UserQuota,
  Trace,
  Span,
  Metric,
  TracesResponse,
  SpansResponse,
  TelemetryQueryParams,
  SpotlightSession,
  SessionAnalyticsParams,
  SessionAnalyticsResponse
}

export const telemetryService = {
  async fetchResources(token: string): Promise<Resource[]> {
    const response = await fetch(`${API_BASE_URL}/telemetry/fetch_resources`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchTraces(token: string, params: TelemetryQueryParams): Promise<TracesResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_time', params.start_time)
    queryParams.append('end_time', params.end_time)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString())
    if (params.sort) queryParams.append('sort', params.sort)
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection)
    if (params.service_name) queryParams.append('service_name', params.service_name)
    if (params.status) queryParams.append('status', params.status)

    const response = await fetch(`${API_BASE_URL}/telemetry/fetch_traces?${queryParams}`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchSpans(token: string, params: TelemetryQueryParams): Promise<SpansResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_time', params.start_time)
    queryParams.append('end_time', params.end_time)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString())
    if (params.sort) queryParams.append('sort', params.sort)
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection)
    if (params.service_name) queryParams.append('service_name', params.service_name)

    const response = await fetch(`${API_BASE_URL}/telemetry/fetch_spans?${queryParams}`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchMetrics(token: string, params: TelemetryQueryParams): Promise<Metric[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_time', params.start_time)
    queryParams.append('end_time', params.end_time)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())

    const response = await fetch(`${API_BASE_URL}/telemetry/fetch_metrics?${queryParams}`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  }
}

interface UserPreference {
  uuid: string
  preference_key: string
  preference_value: any
  created_at: string
  updated_at: string
}

interface SavePreferenceRequest {
  preference_key: string
  preference_value: any
}

export const userPreferencesService = {
  async savePreference(token: string, data: SavePreferenceRequest): Promise<{ message: string; preference: UserPreference }> {
    const response = await fetch(`${API_BASE_URL}/user/preferences`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async getPreferences(token: string): Promise<{ preferences: UserPreference[] }> {
    const response = await fetch(`${API_BASE_URL}/user/preferences`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async getPreference(token: string, preferenceKey: string): Promise<{ preference: UserPreference }> {
    const queryParams = new URLSearchParams()
    queryParams.append('preference_key', preferenceKey)

    const response = await fetch(`${API_BASE_URL}/user/preferences?${queryParams}`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async deletePreference(token: string, preferenceKey: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/user/preferences/${preferenceKey}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  }
}

interface SpotlightSession {
  uuid: string
  session_id: string
  start_time: string
  end_time: string | null
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_input_tokens: number
  total_cache_creation_ephemeral_5m_input_tokens: number
  total_cache_creation_ephemeral_1h_input_tokens: number
  interaction_count: number
  last_message_preview: string
  share_token: string
}

interface SessionAnalyticsParams {
  limit?: number
  offset?: number
  sort?: string
  sortDirection?: 'asc' | 'desc'
  session_id?: string
  start_date?: string
  end_date?: string
  model?: string
  provider?: string
}

interface SessionAnalyticsResponse {
  sessions: SpotlightSession[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

interface ShinzoApiKey {
  uuid: string
  key_name: string
  api_key: string
  key_prefix: string
  key_type: 'live' | 'test'
  status: 'active' | 'inactive' | 'revoked'
  last_used: string | null
  created_at: string
}

interface UserSurvey {
  uuid: string
  usage_types: string[]
  role?: string
  referral_sources?: string[]
  created_at: string
}

export const spotlightService = {
  async fetchSessions(token: string, params: SessionAnalyticsParams = {}): Promise<SessionAnalyticsResponse> {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString())
    if (params.sort) queryParams.append('sort', params.sort)
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection)
    if (params.session_id) queryParams.append('session_id', params.session_id)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)
    if (params.model) queryParams.append('model', params.model)
    if (params.provider) queryParams.append('provider', params.provider)

    const response = await fetch(`${API_BASE_URL}/spotlight/analytics/sessions?${queryParams}`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchShinzoApiKeys(token: string): Promise<{ shinzo_api_keys: ShinzoApiKey[] }> {
    const response = await fetch(`${API_BASE_URL}/spotlight/shinzo_keys`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async createShinzoApiKey(token: string, data: { key_name: string; key_type: 'live' | 'test' }): Promise<ShinzoApiKey> {
    const response = await fetch(`${API_BASE_URL}/spotlight/shinzo_keys`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  }
}

export const surveyService = {
  async saveSurvey(token: string, data: { usage_types: string[]; role?: string; referral_sources?: string[] }): Promise<{ survey: UserSurvey }> {
    const response = await fetch(`${API_BASE_URL}/user/survey`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async fetchSurvey(token: string): Promise<{ survey: UserSurvey | null }> {
    const response = await fetch(`${API_BASE_URL}/user/survey`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  }
}

// Streaming API service for Claude/Anthropic model proxy
export interface StreamingMessageRequest {
  model: string
  max_tokens: number
  messages: Array<{
    role: 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; [key: string]: any }>
  }>
  system?: string
  temperature?: number
  tools?: any[]
  stream: true
  metadata?: {
    user_id?: string
  }
}

export const streamingService = {
  /**
   * Stream a message request to Claude via the Spotlight proxy
   *
   * @param shinzoApiKey - Your Shinzo API key (starts with "sk-shinzo-...")
   * @param provider - Provider name (e.g., "anthropic")
   * @param request - The Claude API request body with stream: true
   * @param handlers - Event handlers for SSE events, message completion, and errors
   * @returns Promise that resolves with the final complete message
   */
  async streamMessage(
    shinzoApiKey: string,
    provider: string,
    request: StreamingMessageRequest,
    handlers: {
      onEvent?: SSEEventHandler
      onMessageComplete?: MessageCompleteHandler
      onError?: SSEErrorHandler
    }
  ): Promise<MessageState> {
    const url = `${API_BASE_URL}/spotlight/${provider}/v1/messages`

    return streamClaudeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${shinzoApiKey}`,
      },
      body: JSON.stringify(request)
    }, handlers)
  },

  /**
   * Make a non-streaming request to Claude via the Spotlight proxy
   *
   * @param shinzoApiKey - Your Shinzo API key
   * @param provider - Provider name (e.g., "anthropic")
   * @param request - The Claude API request body (stream should be false or omitted)
   * @returns Promise that resolves with the complete message
   */
  async sendMessage(
    shinzoApiKey: string,
    provider: string,
    request: Omit<StreamingMessageRequest, 'stream'> & { stream?: false }
  ): Promise<any> {
    const url = `${API_BASE_URL}/spotlight/${provider}/v1/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${shinzoApiKey}`,
      },
      body: JSON.stringify({ ...request, stream: false })
    })

    return handleResponse(response)
  }
}

export type { MessageState } from './utils/sseClient'
