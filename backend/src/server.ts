import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import fastifyCors from '@fastify/cors'
import { PORT } from './config'
import { logger, pinoConfig } from './logger'
import { sendReply } from './utils'
import * as yup from 'yup'
import { handleLogin, loginSchema } from './handlers/user'
import { authenticateRequest } from './handlers/authentication'
// import {
//   createDashboard,
//   createDashboardSchema,
//   updateDashboard,
//   updateDashboardSchema,
//   deleteDashboard,
//   deleteDashboardSchema,
//   readDashboard,
//   readDashboardSchema,
//   toggleStar,
//   toggleStarSchema,
//   listDashboards,
//   listDashboardsSchema
// } from './handlers/dashboards'
// import {
//   callBlockchain,
//   callBlockchainSchema,
//   listBlockchains,
//   listBlockchainsSchema
// } from './handlers/blockchain'
import { User } from './models'

type Response<ResponseBody extends any> = {
  response: ResponseBody | string
  error?: boolean
  status?: number
}

type RequestHandler<RequestBodySchema extends yup.ISchema<any, any, any, any>, ResponseBody> = (
  userUuid: User["uuid"],
  request: yup.InferType<RequestBodySchema>
) => Promise<Response<ResponseBody>>

const app = fastify({
  logger: pinoConfig('backend'),
  bodyLimit: 1024 * 1024 * 16, // 16 MiB
})

const requestMiddleware = <T extends yup.ISchema<any, any, any, any>>(
  requestHandler: RequestHandler<T, any>,
  requestBodySchema: T,
  requireAuth: boolean = true
) => async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { body } = request
    logger.debug({ request: body })

    let validatedBody;
    try {
      validatedBody = await requestBodySchema.validate(body, {
        abortEarly: false,
        stripUnknown: true,
        strict: false
      })
    } catch (error: any) {
      logger.warn({ validation_error: error.message })
      return sendReply({
        body: error.message,
        reply,
        status: 400,
        error: true
      })
    }
   
    let userUuid = null
    if (requireAuth) {
      userUuid = await authenticateRequest(request, reply)
      if (!userUuid) return
    }

    const { response, error, status } = await requestHandler(userUuid as string, validatedBody)
    sendReply({ body: response, error, status, reply })
  } catch (error: any) {
    logger.error({ message: 'Request error', error })
    sendReply({
      body: 'Internal server error',
      reply,
      status: 500,
      error: true
    })
  }
}

// Route definitions
// app.post('/blockchain/call', requestMiddleware(callBlockchain, callBlockchainSchema))
// app.post('/blockchain/list', requestMiddleware(listBlockchains, listBlockchainsSchema))
// app.post('/dashboard/create', requestMiddleware(createDashboard, createDashboardSchema))
// app.post('/dashboard/delete', requestMiddleware(deleteDashboard, deleteDashboardSchema))
// app.post('/dashboard/list', requestMiddleware(listDashboards, listDashboardsSchema))
// app.post('/dashboard/read', requestMiddleware(readDashboard, readDashboardSchema))
// app.post('/dashboard/toggleStar', requestMiddleware(toggleStar, toggleStarSchema))
// app.post('/dashboard/update', requestMiddleware(updateDashboard, updateDashboardSchema))
// app.post('/user/login', requestMiddleware(handleLogin, loginSchema, false))

const start = async () => {
  try {
    // Register CORS plugin
    await app.register(fastifyCors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    })

    logger.info({ msg: `Starting service on port ${PORT}` })
    await app.listen({ port: parseInt(PORT), host: '0.0.0.0' })
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

start()
