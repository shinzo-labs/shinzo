import { Op } from 'sequelize'
import { Session, SessionEvent, Resource } from '../models'
import { sequelize } from '../dbClient'
import { logger } from '../logger'

export interface SessionData {
  session_id: string
  user_uuid: string
  resource_uuid: string
  start_time: Date
  metadata?: Record<string, any>
}

export interface SessionEventData {
  session_uuid: string
  timestamp: Date
  event_type: 'tool_call' | 'tool_response' | 'error' | 'user_input' | 'system_message'
  tool_name?: string
  input_data?: Record<string, any>
  output_data?: Record<string, any>
  error_data?: Record<string, any>
  duration_ms?: number
  metadata?: Record<string, any>
}

export interface SessionFilter {
  user_uuid: string
  start_time?: Date
  end_time?: Date
  status?: 'active' | 'completed' | 'error'
  resource_uuid?: string
}

/**
 * Create or update a session
 */
export async function upsertSession(data: SessionData): Promise<Session> {
  try {
    const [session] = await Session.findOrCreate({
      where: {
        session_id: data.session_id
      },
      defaults: {
        user_uuid: data.user_uuid,
        resource_uuid: data.resource_uuid,
        start_time: data.start_time,
        status: 'active',
        total_events: 0,
        metadata: data.metadata || null
      }
    })

    return session
  } catch (error) {
    logger.error({ message: 'Error upserting session', error, data })
    throw error
  }
}

/**
 * Add an event to a session
 */
export async function addSessionEvent(data: SessionEventData): Promise<SessionEvent> {
  const transaction = await sequelize.transaction()

  try {
    // Create the event
    const event = await SessionEvent.create({
      session_uuid: data.session_uuid,
      timestamp: data.timestamp,
      event_type: data.event_type,
      tool_name: data.tool_name || null,
      input_data: data.input_data || null,
      output_data: data.output_data || null,
      error_data: data.error_data || null,
      duration_ms: data.duration_ms || null,
      metadata: data.metadata || null
    }, { transaction })

    // Increment session event count
    await Session.increment('total_events', {
      where: { uuid: data.session_uuid },
      transaction
    })

    // If this is an error event, update session status
    if (data.event_type === 'error') {
      const errorMessage = data.error_data?.message || 'Unknown error'
      await Session.update(
        {
          status: 'error',
          error_message: errorMessage
        },
        {
          where: { uuid: data.session_uuid },
          transaction
        }
      )
    }

    await transaction.commit()

    return event
  } catch (error) {
    await transaction.rollback()
    logger.error({ message: 'Error adding session event', error, data })
    throw error
  }
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionUuid: string,
  endTime: Date
): Promise<void> {
  try {
    await Session.update(
      {
        end_time: endTime,
        status: 'completed'
      },
      {
        where: {
          uuid: sessionUuid,
          status: 'active'
        }
      }
    )
  } catch (error) {
    logger.error({ message: 'Error completing session', error, sessionUuid })
    throw error
  }
}

/**
 * List sessions with filtering
 */
export async function listSessions(
  filter: SessionFilter,
  limit: number = 50,
  offset: number = 0
): Promise<{ sessions: Session[]; total: number }> {
  try {
    const where: any = {
      user_uuid: filter.user_uuid
    }

    if (filter.status) {
      where.status = filter.status
    }

    if (filter.resource_uuid) {
      where.resource_uuid = filter.resource_uuid
    }

    if (filter.start_time || filter.end_time) {
      where.start_time = {}
      if (filter.start_time) {
        where.start_time[Op.gte] = filter.start_time
      }
      if (filter.end_time) {
        where.start_time[Op.lte] = filter.end_time
      }
    }

    const { rows: sessions, count: total } = await Session.findAndCountAll({
      where,
      include: [
        {
          model: Resource,
          as: 'resource',
          attributes: ['uuid', 'service_name', 'service_version']
        }
      ],
      limit,
      offset,
      order: [['start_time', 'DESC']]
    })

    return { sessions, total }
  } catch (error) {
    logger.error({ message: 'Error listing sessions', error, filter })
    throw error
  }
}

/**
 * Get session details with all events
 */
export async function getSessionDetails(
  sessionUuid: string,
  userUuid: string
): Promise<Session | null> {
  try {
    const session = await Session.findOne({
      where: {
        uuid: sessionUuid,
        user_uuid: userUuid
      },
      include: [
        {
          model: Resource,
          as: 'resource',
          attributes: ['uuid', 'service_name', 'service_version', 'service_namespace']
        },
        {
          model: SessionEvent,
          as: 'events',
          required: false
        }
      ]
    })

    return session
  } catch (error) {
    logger.error({ message: 'Error getting session details', error, sessionUuid })
    throw error
  }
}

/**
 * Search sessions by error code or message
 */
export async function searchSessionsByError(
  userUuid: string,
  errorQuery: string,
  limit: number = 50
): Promise<Session[]> {
  try {
    const sessions = await Session.findAll({
      where: {
        user_uuid: userUuid,
        status: 'error',
        error_message: {
          [Op.iLike]: `%${errorQuery}%`
        }
      },
      include: [
        {
          model: Resource,
          as: 'resource',
          attributes: ['uuid', 'service_name']
        }
      ],
      limit,
      order: [['start_time', 'DESC']]
    })

    return sessions
  } catch (error) {
    logger.error({ message: 'Error searching sessions by error', error, errorQuery })
    throw error
  }
}

/**
 * Apply privacy filtering to session data
 */
export function filterSensitiveData(
  data: Record<string, any>,
  sensitiveKeys: string[] = ['password', 'token', 'api_key', 'secret', 'auth']
): Record<string, any> {
  const filtered: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    // Check if key contains sensitive terms
    const isSensitive = sensitiveKeys.some(term =>
      key.toLowerCase().includes(term)
    )

    if (isSensitive) {
      filtered[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value, sensitiveKeys)
    } else {
      filtered[key] = value
    }
  }

  return filtered
}

/**
 * Export session data to JSON
 */
export async function exportSessionToJSON(
  sessionUuid: string,
  userUuid: string,
  applySensitiveFilter: boolean = true
): Promise<string> {
  try {
    const session = await getSessionDetails(sessionUuid, userUuid)

    if (!session) {
      throw new Error('Session not found')
    }

    const sessionData = session.toJSON()

    // Apply privacy filtering if requested
    if (applySensitiveFilter && sessionData.events) {
      sessionData.events = sessionData.events.map((event: any) => ({
        ...event,
        input_data: event.input_data ? filterSensitiveData(event.input_data) : null,
        output_data: event.output_data ? filterSensitiveData(event.output_data) : null,
        error_data: event.error_data ? filterSensitiveData(event.error_data) : null
      }))
    }

    return JSON.stringify(sessionData, null, 2)
  } catch (error) {
    logger.error({ message: 'Error exporting session to JSON', error, sessionUuid })
    throw error
  }
}
