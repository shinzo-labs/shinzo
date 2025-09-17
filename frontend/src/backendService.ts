import { API_BASE_URL } from './config'

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
  status: string | null
  duration_ms: number | null
  attributes: Record<string, any>
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
  }
}

export const ingestTokenService = {
  async generate(token: string): Promise<{ token: string; uuid: string; status: string; created_at: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/generate_ingest_token`, {
      method: 'POST',
      headers: getAuthHeaders(token)
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
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  }
}

export const telemetryService = {
  async fetchResources(token: string): Promise<Resource[]> {
    const response = await fetch(`${API_BASE_URL}/telemetry/fetch_resources`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchTraces(token: string, params: TelemetryQueryParams): Promise<Trace[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_time', params.start_time)
    queryParams.append('end_time', params.end_time)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())

    const response = await fetch(`${API_BASE_URL}/telemetry/fetch_traces?${queryParams}`, {
      headers: getAuthHeaders(token)
    })
    return handleResponse(response)
  },

  async fetchSpans(token: string, params: TelemetryQueryParams): Promise<Span[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('start_time', params.start_time)
    queryParams.append('end_time', params.end_time)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())

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
