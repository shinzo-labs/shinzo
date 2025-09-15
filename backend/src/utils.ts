import { logger } from './logger'
import { FastifyReply } from 'fastify'

type SendReply = {
  body: string | Record<string, any>
  reply: FastifyReply
  status?: number
  error?: boolean
}

export const sendReply = ({ body, status, error, reply }: SendReply) => {
  const statusCode = status ?? (error ? 400 : 200)
  const replyMessage = error
    ? { status: statusCode, error: body }
    : { status: statusCode, body }

  if (error) {
    logger.error({ statusCode, response: body })
  } else {
    logger.info({ statusCode, response: body })
  }

  reply.status(statusCode).send(replyMessage)
}
