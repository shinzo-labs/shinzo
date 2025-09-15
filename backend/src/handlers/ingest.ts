import * as yup from 'yup'
import {
  Resource,
  ResourceAttribute,
  IngestToken,
  Trace,
  Span,
  SpanAttribute,
  Metric,
  MetricAttribute
} from '../models'
import { logger } from '../logger'
import { Transaction } from 'sequelize'
import { sequelize } from '../dbClient'

export const verifyIngestToken = async (token: string): Promise<IngestToken | null> => {
  try {
    const tokenWithoutBearer = token.replace('Bearer ', '')
    const ingestToken = await IngestToken.findOne({
      where: {
        ingest_token: tokenWithoutBearer,
        status: 'live'
      }
    })
    return ingestToken
  } catch (error) {
    logger.error({ message: 'Error verifying ingest token', error })
    return null
  }
}

interface OTLPAttribute {
  key: string
  value: {
    stringValue?: string
    intValue?: number
    doubleValue?: number
    boolValue?: boolean
    arrayValue?: any
  }
}

interface OTLPResource {
  attributes: OTLPAttribute[]
}

interface OTLPSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  startTimeUnixNano: string
  endTimeUnixNano?: string
  attributes: OTLPAttribute[]
  status?: {
    code: number
    message?: string
  }
  kind?: number
}

interface OTLPTrace {
  resource: OTLPResource
  scopeSpans: {
    scope?: {
      name: string
      version?: string
    }
    spans: OTLPSpan[]
  }[]
}

interface OTLPMetric {
  name: string
  description?: string
  unit?: string
  gauge?: {
    dataPoints: {
      timeUnixNano: string
      asDouble?: number
      asInt?: number
      attributes: OTLPAttribute[]
    }[]
  }
  sum?: {
    dataPoints: {
      timeUnixNano: string
      asDouble?: number
      asInt?: number
      attributes: OTLPAttribute[]
    }[]
  }
  histogram?: {
    dataPoints: {
      timeUnixNano: string
      count: number
      sum?: number
      attributes: OTLPAttribute[]
    }[]
  }
}

interface OTLPMetrics {
  resource: OTLPResource
  scopeMetrics: {
    scope?: {
      name: string
      version?: string
    }
    metrics: OTLPMetric[]
  }[]
}

interface OTLPData {
  resourceSpans?: OTLPTrace[]
  resourceMetrics?: OTLPMetrics[]
}

function nanosToDate(nanos: string): Date {
  return new Date(parseInt(nanos) / 1000000)
}

function getAttributeValue(attr: OTLPAttribute) {
  const value = attr.value
  if (value.stringValue !== undefined) {
    return { type: 'string', value: value.stringValue }
  } else if (value.intValue !== undefined) {
    return { type: 'int', value: value.intValue }
  } else if (value.doubleValue !== undefined) {
    return { type: 'double', value: value.doubleValue }
  } else if (value.boolValue !== undefined) {
    return { type: 'bool', value: value.boolValue }
  } else if (value.arrayValue !== undefined) {
    return { type: 'array', value: value.arrayValue }
  }
  return { type: 'string', value: '' }
}

async function findOrCreateResource(
  userUuid: string,
  resourceAttrs: OTLPAttribute[],
  transaction: Transaction
): Promise<Resource> {
  let serviceName = 'unknown'
  let serviceVersion: string | null = null
  let serviceNamespace: string | null = null

  for (const attr of resourceAttrs) {
    if (attr.key === 'service.name') {
      serviceName = attr.value.stringValue || 'unknown'
    } else if (attr.key === 'service.version') {
      serviceVersion = attr.value.stringValue || null
    } else if (attr.key === 'service.namespace') {
      serviceNamespace = attr.value.stringValue || null
    }
  }

  const [resource] = await Resource.findOrCreate({
    where: {
      user_uuid: userUuid,
      service_name: serviceName,
      service_version: serviceVersion || null,
      service_namespace: serviceNamespace || null
    },
    defaults: {
      user_uuid: userUuid,
      service_name: serviceName,
      service_version: serviceVersion,
      service_namespace: serviceNamespace,
      first_seen: new Date(),
      last_seen: new Date()
    },
    transaction
  })

  // Update last_seen
  await resource.update({ last_seen: new Date() }, { transaction })

  // Store resource attributes
  for (const attr of resourceAttrs) {
    const attrValue = getAttributeValue(attr)
    await ResourceAttribute.findOrCreate({
      where: {
        resource_uuid: resource.uuid,
        key: attr.key
      },
      defaults: {
        resource_uuid: resource.uuid,
        key: attr.key,
        value_type: attrValue.type,
        string_value: attrValue.type === 'string' ? attrValue.value : null,
        int_value: attrValue.type === 'int' ? attrValue.value : null,
        double_value: attrValue.type === 'double' ? attrValue.value : null,
        bool_value: attrValue.type === 'bool' ? attrValue.value : null,
        array_value: attrValue.type === 'array' ? attrValue.value : null
      },
      transaction
    })
  }

  return resource
}

export const handleIngestHTTP = async (ingestToken: IngestToken, data: OTLPData) => {
  const transaction = await sequelize.transaction()

  try {
    let totalSpans = 0
    let totalMetrics = 0

    // Process traces and spans
    if (data.resourceSpans) {
      for (const resourceSpan of data.resourceSpans) {
        const resource = await findOrCreateResource(
          ingestToken.user_uuid,
          resourceSpan.resource.attributes,
          transaction
        )

        for (const scopeSpan of resourceSpan.scopeSpans) {
          for (const otlpSpan of scopeSpan.spans) {
            const startTime = nanosToDate(otlpSpan.startTimeUnixNano)
            const endTime = otlpSpan.endTimeUnixNano ? nanosToDate(otlpSpan.endTimeUnixNano) : null
            const durationMs = endTime ? endTime.getTime() - startTime.getTime() : null

            // Create or find trace
            const [trace] = await Trace.findOrCreate({
              where: {
                resource_uuid: resource.uuid,
                ingest_token_uuid: ingestToken.uuid,
                start_time: startTime
              },
              defaults: {
                resource_uuid: resource.uuid,
                ingest_token_uuid: ingestToken.uuid,
                start_time: startTime,
                end_time: endTime,
                service_name: resource.service_name,
                operation_name: otlpSpan.name,
                status: otlpSpan.status?.code === 2 ? 'error' : 'ok',
                span_count: 0
              },
              transaction
            })

            // Create span
            const span = await Span.create({
              trace_uuid: trace.uuid,
              parent_span_uuid: otlpSpan.parentSpanId || null,
              operation_name: otlpSpan.name,
              start_time: startTime,
              end_time: endTime,
              duration_ms: durationMs,
              status_code: otlpSpan.status?.code || null,
              status_message: otlpSpan.status?.message || null,
              span_kind: otlpSpan.kind?.toString() || null,
              service_name: resource.service_name
            }, { transaction })

            // Create span attributes
            for (const attr of otlpSpan.attributes) {
              const attrValue = getAttributeValue(attr)
              await SpanAttribute.create({
                span_uuid: span.uuid,
                key: attr.key,
                value_type: attrValue.type,
                string_value: attrValue.type === 'string' ? attrValue.value : null,
                int_value: attrValue.type === 'int' ? attrValue.value : null,
                double_value: attrValue.type === 'double' ? attrValue.value : null,
                bool_value: attrValue.type === 'bool' ? attrValue.value : null,
                array_value: attrValue.type === 'array' ? attrValue.value : null
              }, { transaction })
            }

            // Update trace span count
            await trace.increment('span_count', { transaction })
            totalSpans++
          }
        }
      }
    }

    // Process metrics
    if (data.resourceMetrics) {
      for (const resourceMetric of data.resourceMetrics) {
        const resource = await findOrCreateResource(
          ingestToken.user_uuid,
          resourceMetric.resource.attributes,
          transaction
        )

        for (const scopeMetric of resourceMetric.scopeMetrics) {
          for (const otlpMetric of scopeMetric.metrics) {
            let metricType: 'counter' | 'gauge' | 'histogram' = 'gauge'
            let dataPoints: any[] = []

            if (otlpMetric.gauge) {
              metricType = 'gauge'
              dataPoints = otlpMetric.gauge.dataPoints
            } else if (otlpMetric.sum) {
              metricType = 'counter'
              dataPoints = otlpMetric.sum.dataPoints
            } else if (otlpMetric.histogram) {
              metricType = 'histogram'
              dataPoints = otlpMetric.histogram.dataPoints
            }

            for (const dataPoint of dataPoints) {
              const timestamp = nanosToDate(dataPoint.timeUnixNano)
              const value = dataPoint.asDouble || dataPoint.asInt || dataPoint.sum || dataPoint.count || 0

              const metric = await Metric.create({
                resource_uuid: resource.uuid,
                ingest_token_uuid: ingestToken.uuid,
                name: otlpMetric.name,
                description: otlpMetric.description || null,
                unit: otlpMetric.unit || null,
                metric_type: metricType,
                timestamp: timestamp,
                value: value,
                scope_name: scopeMetric.scope?.name || null,
                scope_version: scopeMetric.scope?.version || null
              }, { transaction })

              // Create metric attributes
              for (const attr of dataPoint.attributes || []) {
                const attrValue = getAttributeValue(attr)
                await MetricAttribute.create({
                  metric_uuid: metric.uuid,
                  key: attr.key,
                  value_type: attrValue.type,
                  string_value: attrValue.type === 'string' ? attrValue.value : null,
                  int_value: attrValue.type === 'int' ? attrValue.value : null,
                  double_value: attrValue.type === 'double' ? attrValue.value : null,
                  bool_value: attrValue.type === 'bool' ? attrValue.value : null,
                  array_value: attrValue.type === 'array' ? attrValue.value : null
                }, { transaction })
              }

              totalMetrics++
            }
          }
        }
      }
    }

    await transaction.commit()

    logger.info({
      message: 'OTLP data ingested successfully',
      ingestTokenUuid: ingestToken.uuid,
      spansProcessed: totalSpans,
      metricsProcessed: totalMetrics
    })

    return {
      response: {
        message: 'Data ingested successfully',
        spansProcessed: totalSpans,
        metricsProcessed: totalMetrics
      },
      status: 200
    }

  } catch (error) {
    await transaction.rollback()
    logger.error({ message: 'Error ingesting OTLP data', error })
    return {
      response: 'Error processing ingestion data',
      error: true,
      status: 500
    }
  }
}