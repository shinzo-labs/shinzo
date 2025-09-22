import dotenv from 'dotenv'
dotenv.config()

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL ?? ''

// Server Configuration
export const PORT = process.env.BACKEND_PORT ?? process.env.PORT ?? '8000'
export const GRPC_PORT = process.env.GRPC_PORT ?? '4317'
export const HTTP_PORT = process.env.HTTP_PORT ?? '4318'
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
export const TZ = process.env.TZ ?? ''

// OTLP Ingestion Configuration
export const MAX_PAYLOAD_SIZE = process.env.MAX_PAYLOAD_SIZE ?? '4mb'
export const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? '1000')
export const ENABLE_COMPRESSION = process.env.ENABLE_COMPRESSION === 'true'
export const BATCH_TIMEOUT = parseInt(process.env.BATCH_TIMEOUT ?? '5000')
export const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE ?? '1000')

// Authentication Configuration
export const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? 'jwt'
export const JWT_SECRET = process.env.JWT_SECRET ?? 'default-secret-change-in-production'
export const API_KEY_STORE = process.env.API_KEY_STORE ?? 'database'

// Rate Limiting Configuration
export const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW ?? '60000')
export const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '1000')
export const RATE_LIMIT_BY_KEY = process.env.RATE_LIMIT_BY_KEY === 'true'
export const ENABLE_IP_RATE_LIMIT = process.env.ENABLE_IP_RATE_LIMIT === 'true'

// Email Configuration
export const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY ?? ''
export const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN ?? 'transactional.shinzo.ai'
export const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@transactional.shinzo.ai'
export const FROM_NAME = process.env.FROM_NAME ?? 'Shinzo Platform'
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3004'

// Frontend Configuration
export const API_BASE_URL = process.env.API_BASE_URL ?? `http://localhost:${PORT}`
export const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL ?? '30000')
export const MAX_CACHE_AGE = parseInt(process.env.MAX_CACHE_AGE ?? '300000')
export const ENABLE_REALTIME = process.env.ENABLE_REALTIME === 'true'
export const DEFAULT_TIME_RANGE = process.env.DEFAULT_TIME_RANGE ?? '1h'
