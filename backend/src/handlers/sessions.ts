import * as yup from 'yup'
import { logger } from '../logger'
import {
  upsertSession,
  addSessionEvent,
  completeSession,
  listSessions,
  getSessionDetails,
  searchSessionsByError,
  exportSessionToJSON,
  SessionData,
  SessionEventData,
  SessionFilter
} from '../services/sessions'

export const createSessionSchema = yup.object({
  session_id: yup.string().required('Session ID is required'),
  resource_uuid: yup.string().uuid('Resource UUID must be valid').required('Resource UUID is required'),
  start_time: yup.string().required('Start time is required'),
  metadata: yup.object().optional()
}).required()

export const addSessionEventSchema = yup.object({
  session_uuid: yup.string().uuid('Session UUID must be valid').required('Session UUID is required'),
  timestamp: yup.string().required('Timestamp is required'),
  event_type: yup.string().oneOf(['tool_call', 'tool_response', 'error', 'user_input', 'system_message']).required('Event type is required'),
  tool_name: yup.string().optional(),
  input_data: yup.object().optional(),
  output_data: yup.object().optional(),
  error_data: yup.object().optional(),
  duration_ms: yup.number().optional(),
  metadata: yup.object().optional()
}).required()

export const completeSessionSchema = yup.object({
  session_uuid: yup.string().uuid('Session UUID must be valid').required('Session UUID is required'),
  end_time: yup.string().required('End time is required')
}).required()

export const listSessionsSchema = yup.object({
  start_time: yup.string().optional(),
  end_time: yup.string().optional(),
  status: yup.string().oneOf(['active', 'completed', 'error']).optional(),
  resource_uuid: yup.string().uuid().optional(),
  limit: yup.number().min(1).max(100).default(50),
  offset: yup.number().min(0).default(0)
}).required()

export const searchSessionsSchema = yup.object({
  error_query: yup.string().required('Error query is required'),
  limit: yup.number().min(1).max(100).default(50)
}).required()

/**
 * Create or update a session
 */
export const handleCreateSession = async (
  userUuid: string,
  body: yup.InferType<typeof createSessionSchema>
) => {
  try {
    const sessionData: SessionData = {
      session_id: body.session_id,
      user_uuid: userUuid,
      resource_uuid: body.resource_uuid,
      start_time: new Date(body.start_time),
      metadata: body.metadata
    }

    const session = await upsertSession(sessionData)

    return {
      response: {
        session_uuid: session.uuid,
        session_id: session.session_id,
        status: session.status
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error creating session', error })
    return {
      response: 'Error creating session',
      error: true,
      status: 500
    }
  }
}

/**
 * Add event to session
 */
export const handleAddSessionEvent = async (
  userUuid: string,
  body: yup.InferType<typeof addSessionEventSchema>
) => {
  try {
    const eventData: SessionEventData = {
      session_uuid: body.session_uuid,
      timestamp: new Date(body.timestamp),
      event_type: body.event_type as any,
      tool_name: body.tool_name,
      input_data: body.input_data,
      output_data: body.output_data,
      error_data: body.error_data,
      duration_ms: body.duration_ms,
      metadata: body.metadata
    }

    const event = await addSessionEvent(eventData)

    return {
      response: {
        event_uuid: event.uuid,
        session_uuid: event.session_uuid
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error adding session event', error })
    return {
      response: 'Error adding session event',
      error: true,
      status: 500
    }
  }
}

/**
 * Complete a session
 */
export const handleCompleteSession = async (
  userUuid: string,
  body: yup.InferType<typeof completeSessionSchema>
) => {
  try {
    await completeSession(body.session_uuid, new Date(body.end_time))

    return {
      response: { success: true },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error completing session', error })
    return {
      response: 'Error completing session',
      error: true,
      status: 500
    }
  }
}

/**
 * List sessions with filtering
 */
export const handleListSessions = async (
  userUuid: string,
  query: yup.InferType<typeof listSessionsSchema>
) => {
  try {
    const filter: SessionFilter = {
      user_uuid: userUuid,
      start_time: query.start_time ? new Date(query.start_time) : undefined,
      end_time: query.end_time ? new Date(query.end_time) : undefined,
      status: query.status as any,
      resource_uuid: query.resource_uuid
    }

    const { sessions, total } = await listSessions(filter, query.limit, query.offset)

    return {
      response: {
        sessions: sessions.map(s => ({
          uuid: s.uuid,
          session_id: s.session_id,
          resource_uuid: s.resource_uuid,
          resource: (s as any).resource,
          start_time: s.start_time,
          end_time: s.end_time,
          status: s.status,
          error_message: s.error_message,
          total_events: s.total_events,
          metadata: s.metadata,
          created_at: s.created_at,
          updated_at: s.updated_at
        })),
        total,
        limit: query.limit,
        offset: query.offset
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error listing sessions', error })
    return {
      response: 'Error listing sessions',
      error: true,
      status: 500
    }
  }
}

/**
 * Get session details with events
 */
export const handleGetSessionDetails = async (
  userUuid: string,
  sessionUuid: string
) => {
  try {
    const session = await getSessionDetails(sessionUuid, userUuid)

    if (!session) {
      return {
        response: 'Session not found',
        error: true,
        status: 404
      }
    }

    return {
      response: {
        uuid: session.uuid,
        session_id: session.session_id,
        resource_uuid: session.resource_uuid,
        resource: (session as any).resource,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
        error_message: session.error_message,
        total_events: session.total_events,
        metadata: session.metadata,
        events: (session as any).events?.map((e: any) => ({
          uuid: e.uuid,
          timestamp: e.timestamp,
          event_type: e.event_type,
          tool_name: e.tool_name,
          input_data: e.input_data,
          output_data: e.output_data,
          error_data: e.error_data,
          duration_ms: e.duration_ms,
          metadata: e.metadata,
          created_at: e.created_at
        })),
        created_at: session.created_at,
        updated_at: session.updated_at
      },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error getting session details', error })
    return {
      response: 'Error getting session details',
      error: true,
      status: 500
    }
  }
}

/**
 * Search sessions by error
 */
export const handleSearchSessionsByError = async (
  userUuid: string,
  query: yup.InferType<typeof searchSessionsSchema>
) => {
  try {
    const sessions = await searchSessionsByError(userUuid, query.error_query, query.limit)

    return {
      response: sessions.map(s => ({
        uuid: s.uuid,
        session_id: s.session_id,
        resource: (s as any).resource,
        start_time: s.start_time,
        end_time: s.end_time,
        error_message: s.error_message,
        total_events: s.total_events
      })),
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error searching sessions by error', error })
    return {
      response: 'Error searching sessions by error',
      error: true,
      status: 500
    }
  }
}

/**
 * Export session to JSON
 */
export const handleExportSession = async (
  userUuid: string,
  sessionUuid: string,
  applySensitiveFilter: boolean = true
) => {
  try {
    const jsonData = await exportSessionToJSON(sessionUuid, userUuid, applySensitiveFilter)

    return {
      response: { data: jsonData },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error exporting session', error })
    return {
      response: 'Error exporting session',
      error: true,
      status: 500
    }
  }
}
