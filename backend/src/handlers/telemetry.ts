import * as yup from 'yup'
import { Op } from 'sequelize'
import {
  Resource,
  Trace,
  Span,
  Metric,
  ResourceAttribute,
  SpanAttribute,
  MetricAttribute,
  IngestToken
} from '../models'
import { logger } from '../logger'

export const fetchDataSchema = yup.object({
  start_time: yup.string().required('Start time is required'),
  end_time: yup.string().required('End time is required'),
  limit: yup.number().optional().default(25).max(1000),
  offset: yup.number().optional().default(0),
  sort: yup.string().optional().default('start_time'),
  sortDirection: yup.string().optional().oneOf(['asc', 'desc']).default('desc'),
  // Filters
  service_name: yup.string().optional(),
  status: yup.string().optional(),
}).required()

export const handleFetchResources = async (userUuid: string) => {
  try {
    const resources = await Resource.findAll({
      where: { user_uuid: userUuid },
      include: [
        {
          model: ResourceAttribute,
          as: 'attributes',
          required: false
        }
      ],
      order: [['last_seen', 'DESC']]
    })

    return {
      response: resources.map(resource => {
        // Transform attributes array to key-value object
        const attributes: Record<string, any> = {}
        if ((resource as any).attributes && Array.isArray((resource as any).attributes)) {
          (resource as any).attributes.forEach((attr: any) => {
            let value: any
            switch (attr.value_type) {
              case 'string':
                value = attr.string_value
                break
              case 'int':
                value = attr.int_value
                break
              case 'double':
                value = attr.double_value
                break
              case 'bool':
                value = attr.bool_value
                break
              case 'array':
                value = attr.array_value
                break
              default:
                value = attr.string_value
            }
            attributes[attr.key] = value
          })
        }

        return {
          uuid: resource.uuid,
          service_name: resource.service_name,
          service_version: resource.service_version,
          service_namespace: resource.service_namespace,
          first_seen: resource.first_seen,
          last_seen: resource.last_seen,
          created_at: resource.created_at,
          updated_at: resource.updated_at,
          attributes
        }
      }),
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching resources', error })
    return {
      response: 'Error fetching resources',
      error: true,
      status: 500
    }
  }
}

export const handleFetchTraces = async (userUuid: string, query: yup.InferType<typeof fetchDataSchema>) => {
  try {
    const startTime = new Date(query.start_time)
    const endTime = new Date(query.end_time)
    const limit = query.limit || 25
    const offset = query.offset || 0
    const sort = query.sort || 'start_time'
    const sortDirection = query.sortDirection || 'desc'

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return {
        response: 'Invalid time format',
        error: true,
        status: 400
      }
    }

    // Validate sort column to prevent SQL injection
    const validSortColumns = ['start_time', 'end_time', 'service_name', 'operation_name', 'status', 'span_count']
    const safeSort = validSortColumns.includes(sort) ? sort : 'start_time'
    const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC'

    // Build where clause with optional filters
    const whereClause: any = {
      start_time: {
        [Op.gte]: startTime,
        [Op.lte]: endTime
      }
    }
    if (query.service_name) {
      whereClause.service_name = { [Op.iLike]: `%${query.service_name}%` }
    }
    if (query.status && query.status !== 'all') {
      whereClause.status = query.status
    }

    // Get total count first
    const totalCount = await Trace.count({
      where: whereClause,
      include: [
        {
          model: Resource,
          as: 'resource',
          required: true,
          where: { user_uuid: userUuid },
          attributes: []
        }
      ]
    })

    // Single optimized query with JOIN instead of two separate queries
    const traces = await Trace.findAll({
      where: whereClause,
      include: [
        {
          model: Resource,
          as: 'resource',
          required: true,
          where: { user_uuid: userUuid },
          attributes: [] // Don't fetch resource columns, we only need the filter
        }
      ],
      order: [[safeSort, safeSortDirection]],
      limit,
      offset
    })

    return {
      response: {
        traces: traces.map(trace => ({
          uuid: trace.uuid,
          start_time: trace.start_time,
          end_time: trace.end_time,
          service_name: trace.service_name,
          operation_name: trace.operation_name,
          status: trace.status,
          span_count: trace.span_count,
          duration_ms: trace.end_time && trace.start_time
            ? new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime()
            : null,
          created_at: trace.created_at,
          updated_at: trace.updated_at
        })),
        total_count: totalCount,
        page: Math.floor(offset / limit) + 1,
        page_size: limit,
        total_pages: Math.ceil(totalCount / limit),
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching traces', error })
    return {
      response: 'Error fetching traces',
      error: true,
      status: 500
    }
  }
}

export const handleFetchSpans = async (userUuid: string, query: yup.InferType<typeof fetchDataSchema>) => {
  try {
    const startTime = new Date(query.start_time)
    const endTime = new Date(query.end_time)
    const limit = query.limit || 25
    const offset = query.offset || 0
    const sort = query.sort || 'start_time'
    const sortDirection = query.sortDirection || 'desc'

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return {
        response: 'Invalid time format',
        error: true,
        status: 400
      }
    }

    // Validate sort column
    const validSortColumns = ['start_time', 'end_time', 'operation_name', 'duration_ms', 'service_name', 'status_code']
    const safeSort = validSortColumns.includes(sort) ? sort : 'start_time'
    const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC'

    // Build where clause with optional filters
    const whereClause: any = {
      start_time: {
        [Op.gte]: startTime,
        [Op.lte]: endTime
      }
    }
    if (query.service_name) {
      whereClause.service_name = { [Op.iLike]: `%${query.service_name}%` }
    }

    // Get total count first
    const totalCount = await Span.count({
      where: whereClause,
      include: [
        {
          model: Trace,
          as: 'trace',
          required: true,
          attributes: [],
          include: [
            {
              model: Resource,
              as: 'resource',
              required: true,
              where: { user_uuid: userUuid },
              attributes: []
            }
          ]
        }
      ]
    })

    // Single optimized query - join through Trace to Resource for user filtering
    const spans = await Span.findAll({
      where: whereClause,
      include: [
        {
          model: Trace,
          as: 'trace',
          required: true,
          attributes: [],
          include: [
            {
              model: Resource,
              as: 'resource',
              required: true,
              where: { user_uuid: userUuid },
              attributes: []
            }
          ]
        }
      ],
      order: [[safeSort, safeSortDirection]],
      limit,
      offset
    })

    return {
      response: {
        spans: spans.map(span => ({
          uuid: span.uuid,
          trace_uuid: span.trace_uuid,
          parent_span_uuid: span.parent_span_uuid,
          operation_name: span.operation_name,
          start_time: span.start_time,
          end_time: span.end_time,
          duration_ms: span.duration_ms,
          status_code: span.status_code,
          status_message: span.status_message,
          span_kind: span.span_kind,
          service_name: span.service_name,
          created_at: span.created_at,
          updated_at: span.updated_at
        })),
        total_count: totalCount,
        page: Math.floor(offset / limit) + 1,
        page_size: limit,
        total_pages: Math.ceil(totalCount / limit),
      },
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching spans', error })
    return {
      response: 'Error fetching spans',
      error: true,
      status: 500
    }
  }
}

export const handleFetchMetrics = async (userUuid: string, query: yup.InferType<typeof fetchDataSchema>) => {
  try {
    const startTime = new Date(query.start_time)
    const endTime = new Date(query.end_time)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return {
        response: 'Invalid time format',
        error: true,
        status: 400
      }
    }

    const userResources = await Resource.findAll({
      where: { user_uuid: userUuid },
      attributes: ['uuid']
    })

    const resourceUuids = userResources.map(r => r.uuid)

    if (resourceUuids.length === 0) {
      return {
        response: [],
        status: 200
      }
    }

    const metrics = await Metric.findAll({
      where: {
        resource_uuid: { [Op.in]: resourceUuids },
        timestamp: {
          [Op.gte]: startTime,
          [Op.lte]: endTime
        }
      },
      include: [
        {
          model: Resource,
          as: 'resource',
          required: true
        },
        {
          model: MetricAttribute,
          as: 'attributes',
          required: false
        }
      ],
      order: [['timestamp', 'DESC']]
    })

    return {
      response: metrics.map(metric => {
        // Transform attributes array to key-value object
        const attributes: Record<string, any> = {}
        if ((metric as any).attributes && Array.isArray((metric as any).attributes)) {
          (metric as any).attributes.forEach((attr: any) => {
            let value: any
            switch (attr.value_type) {
              case 'string':
                value = attr.string_value
                break
              case 'int':
                value = attr.int_value
                break
              case 'double':
                value = attr.double_value
                break
              case 'bool':
                value = attr.bool_value
                break
              case 'array':
                value = attr.array_value
                break
              default:
                value = attr.string_value
            }
            attributes[attr.key] = value
          })
        }

        return {
          uuid: metric.uuid,
          name: metric.name,
          description: metric.description,
          unit: metric.unit,
          metric_type: metric.metric_type,
          timestamp: metric.timestamp,
          value: metric.value,
          scope_name: metric.scope_name,
          scope_version: metric.scope_version,
          created_at: metric.created_at,
          updated_at: metric.updated_at,
          attributes
        }
      }),
      status: 200
    }

  } catch (error) {
    logger.error({ message: 'Error fetching metrics', error })
    return {
      response: 'Error fetching metrics',
      error: true,
      status: 500
    }
  }
}