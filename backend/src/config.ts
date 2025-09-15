import dotenv from 'dotenv'
dotenv.config()

export const DATABASE_URL = process.env.DATABASE_URL ?? ''
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
export const PORT = process.env.PORT ?? '8000'
export const TZ = process.env.TZ ?? ''
