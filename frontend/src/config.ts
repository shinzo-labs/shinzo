export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? 'http://localhost:8000'
export const LOG_LEVEL = process.env.REACT_APP_LOG_LEVEL ?? 'info'
export const API_BASE_URL = BACKEND_URL
export const REFRESH_INTERVAL = parseInt(process.env.REACT_APP_REFRESH_INTERVAL_MS ?? '5000')
export const MAX_CACHE_AGE = parseInt(process.env.REACT_APP_MAX_CACHE_AGE ?? '300000')
export const ENABLE_REALTIME = process.env.REACT_APP_ENABLE_REALTIME === 'true'
export const DEFAULT_TIME_RANGE = process.env.REACT_APP_DEFAULT_TIME_RANGE ?? '1h'
