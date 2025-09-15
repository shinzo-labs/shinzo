import { Logger, pino } from 'pino'
import { LOG_LEVEL } from './config'

const EDGE_LIMIT = 200

export const pinoConfig = (name: string) => ({
  level: LOG_LEVEL,
  name,
  edgeLimit: EDGE_LIMIT,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true
    }
  },
  levelFirst: true,
  serializers: {
    error: (err: any) => ({
      message: err.message,
      stack: err.stack
    })
  }
})

export const logger: Logger = pino(pinoConfig('shinzo'))
