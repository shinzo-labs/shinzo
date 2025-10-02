import * as yup from 'yup'
import {
  User,
  SubscriptionTier,
  Resource,
  ResourceAttribute,
  IngestToken,
  Trace,
  Span,
  SpanAttribute,
  SpanEvent,
  SpanEventAttribute,
  SpanLink,
  SpanLinkAttribute,
  Metric,
  MetricAttribute,
  HistogramBucket
} from '../models'
import { logger } from '../logger'
import { Transaction } from 'sequelize'
import { sequelize } from '../dbClient'

const CREDIT_PER_SPAN = 1

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

export const checkAndUpdateQuota = async (
  userUuid: string,
  creditsConsumed: number,
  transaction: Transaction
): Promise<{ canIngest: boolean; quotaExceeded?: boolean; quotaInfo?: any }> => {
  try {
    const user = await User.findOne({
      where: { uuid: userUuid },
      include: [{
        model: SubscriptionTier,
        as: 'subscriptionTier'
      }],
      transaction
    })

    if (!user) {
      return { canIngest: false }
    }

    const now = new Date()
    const lastReset = new Date(user.last_counter_reset)
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // Check if we need to reset the counter (if more than 1 month has passed)
    if (lastReset <= oneMonthAgo) {
      await user.update({
        monthly_counter: 0,
        last_counter_reset: now
      }, { transaction })
      user.monthly_counter = 0
    }

    const subscriptionTier = (user as any).subscriptionTier
    const monthlyQuota = subscriptionTier?.monthly_quota

    // If quota is null (scale tier), allow unlimited ingestion
    if (monthlyQuota === null) {
      await user.update({
        monthly_counter: user.monthly_counter + creditsConsumed
      }, { transaction })
      return { canIngest: true }
    }

    // Check if adding this data would exceed quota
    if (user.monthly_counter + creditsConsumed > monthlyQuota) {
      return {
        canIngest: false,
        quotaExceeded: true,
        quotaInfo: {
          currentUsage: user.monthly_counter,
          monthlyQuota: monthlyQuota,
          tier: subscriptionTier?.tier
        }
      }
    }

    // Update the counter
    await user.update({
      monthly_counter: user.monthly_counter + creditsConsumed
    }, { transaction })

    return {
      canIngest: true,
      quotaInfo: {
        currentUsage: user.monthly_counter + creditsConsumed,
        monthlyQuota: monthlyQuota,
        tier: subscriptionTier?.tier
      }
    }

  } catch (error) {
    logger.error({ message: 'Error checking quota', error })
    return { canIngest: false }
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
  droppedAttributesCount?: number
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
  events?: {
    name: string
    timeUnixNano: string
    attributes?: OTLPAttribute[]
    droppedAttributesCount?: number
  }[]
  links?: {
    traceId: string
    spanId: string
    traceState?: string
    attributes?: OTLPAttribute[]
    droppedAttributesCount?: number
  }[]
  droppedAttributesCount?: number
  droppedEventsCount?: number
  droppedLinksCount?: number
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
      startTimeUnixNano?: string
      timeUnixNano: string
      asDouble?: number
      asInt?: number
      attributes: OTLPAttribute[]
    }[]
  }
  sum?: {
    aggregationTemporality?: number
    isMonotonic?: boolean
    dataPoints: {
      startTimeUnixNano?: string
      timeUnixNano: string
      asDouble?: number
      asInt?: number
      attributes: OTLPAttribute[]
    }[]
  }
  histogram?: {
    aggregationTemporality?: number
    dataPoints: {
      startTimeUnixNano?: string
      timeUnixNano: string
      count: number
      sum?: number
      min?: number
      max?: number
      bucketCounts?: number[]
      explicitBounds?: number[]
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
  resource: OTLPResource,
  transaction: Transaction
): Promise<Resource> {
  const resourceAttrs = resource.attributes
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

  const [resourceModel] = await Resource.findOrCreate({
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
      last_seen: new Date(),
      dropped_attributes_count: resource.droppedAttributesCount || 0
    },
    transaction
  })

  // Update last_seen
  await resourceModel.update({ last_seen: new Date() }, { transaction })

  // Store resource attributes
  for (const attr of resourceAttrs) {
    const attrValue = getAttributeValue(attr)
    await ResourceAttribute.findOrCreate({
      where: {
        resource_uuid: resourceModel.uuid,
        key: attr.key
      },
      defaults: {
        resource_uuid: resourceModel.uuid,
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

  return resourceModel
}

export const handleIngestHTTP = async (ingestToken: IngestToken, data: OTLPData) => {
  const transaction = await sequelize.transaction()

  try {
    let totalSpans = 0
    let totalMetrics = 0

    // Calculate total credits first (for quota checking)
    // Note: for now only tool calls (spans) are charged for in the credits.
    // In the future we may charge for other data like metrics and logs.
    let creditsConsumed = 0
    if (data.resourceSpans) {
      for (const resourceSpan of data.resourceSpans) {
        for (const scopeSpan of resourceSpan.scopeSpans) {
          creditsConsumed += scopeSpan.spans.length * CREDIT_PER_SPAN
        }
      }
    }

    // Check quota before processing
    const quotaCheck = await checkAndUpdateQuota(ingestToken.user_uuid, creditsConsumed, transaction)
    if (!quotaCheck.canIngest) {
      await transaction.rollback()
      if (quotaCheck.quotaExceeded) {
        logger.warn({
          message: 'Quota exceeded for user',
          userUuid: ingestToken.user_uuid,
          quotaInfo: quotaCheck.quotaInfo
        })
        return {
          response: {
            message: 'Monthly quota exceeded. Please upgrade your subscription to continue ingesting data.',
            quotaInfo: quotaCheck.quotaInfo
          },
          status: 429
        }
      } else {
        return {
          response: 'Error checking user quota',
          error: true,
          status: 500
        }
      }
    }

    // Process traces and spans
    if (data.resourceSpans) {
      for (const resourceSpan of data.resourceSpans) {
        const resource = await findOrCreateResource(
          ingestToken.user_uuid,
          resourceSpan.resource,
          transaction
        )

        for (const scopeSpan of resourceSpan.scopeSpans) {
          const scopeName = scopeSpan.scope?.name || null
          const scopeVersion = scopeSpan.scope?.version || null

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
                span_count: 0,
                trace_id: otlpSpan.traceId,
                scope_name: scopeName,
                scope_version: scopeVersion
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
              service_name: resource.service_name,
              trace_id: otlpSpan.traceId,
              span_id: otlpSpan.spanId,
              parent_span_id: otlpSpan.parentSpanId || null,
              scope_name: scopeName,
              scope_version: scopeVersion,
              dropped_attributes_count: otlpSpan.droppedAttributesCount || 0,
              dropped_events_count: otlpSpan.droppedEventsCount || 0,
              dropped_links_count: otlpSpan.droppedLinksCount || 0
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

            // Create span events
            if (otlpSpan.events) {
              for (const event of otlpSpan.events) {
                const eventTimestamp = nanosToDate(event.timeUnixNano)
                const spanEvent = await SpanEvent.create({
                  span_uuid: span.uuid,
                  name: event.name,
                  timestamp: eventTimestamp,
                  dropped_attributes_count: event.droppedAttributesCount || 0
                }, { transaction })

                // Create event attributes
                if (event.attributes) {
                  for (const attr of event.attributes) {
                    const attrValue = getAttributeValue(attr)
                    await SpanEventAttribute.create({
                      span_event_uuid: spanEvent.uuid,
                      key: attr.key,
                      value_type: attrValue.type,
                      string_value: attrValue.type === 'string' ? attrValue.value : null,
                      int_value: attrValue.type === 'int' ? attrValue.value : null,
                      double_value: attrValue.type === 'double' ? attrValue.value : null,
                      bool_value: attrValue.type === 'bool' ? attrValue.value : null,
                      array_value: attrValue.type === 'array' ? attrValue.value : null
                    }, { transaction })
                  }
                }
              }
            }

            // Create span links
            if (otlpSpan.links) {
              for (const link of otlpSpan.links) {
                const spanLink = await SpanLink.create({
                  span_uuid: span.uuid,
                  trace_id: link.traceId,
                  span_id: link.spanId,
                  trace_state: link.traceState || null,
                  dropped_attributes_count: link.droppedAttributesCount || 0
                }, { transaction })

                // Create link attributes
                if (link.attributes) {
                  for (const attr of link.attributes) {
                    const attrValue = getAttributeValue(attr)
                    await SpanLinkAttribute.create({
                      span_link_uuid: spanLink.uuid,
                      key: attr.key,
                      value_type: attrValue.type,
                      string_value: attrValue.type === 'string' ? attrValue.value : null,
                      int_value: attrValue.type === 'int' ? attrValue.value : null,
                      double_value: attrValue.type === 'double' ? attrValue.value : null,
                      bool_value: attrValue.type === 'bool' ? attrValue.value : null,
                      array_value: attrValue.type === 'array' ? attrValue.value : null
                    }, { transaction })
                  }
                }
              }
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
          resourceMetric.resource,
          transaction
        )

        for (const scopeMetric of resourceMetric.scopeMetrics) {
          for (const otlpMetric of scopeMetric.metrics) {
            let metricType: 'counter' | 'gauge' | 'histogram' = 'gauge'
            let dataPoints: any[] = []
            let aggregationTemporality: number | null = null
            let isMonotonic: boolean | null = null

            if (otlpMetric.gauge) {
              metricType = 'gauge'
              dataPoints = otlpMetric.gauge.dataPoints
            } else if (otlpMetric.sum) {
              metricType = 'counter'
              dataPoints = otlpMetric.sum.dataPoints
              aggregationTemporality = otlpMetric.sum.aggregationTemporality || null
              isMonotonic = otlpMetric.sum.isMonotonic || null
            } else if (otlpMetric.histogram) {
              metricType = 'histogram'
              dataPoints = otlpMetric.histogram.dataPoints
              aggregationTemporality = otlpMetric.histogram.aggregationTemporality || null
            }

            for (const dataPoint of dataPoints) {
              const timestamp = nanosToDate(dataPoint.timeUnixNano)
              const startTimestamp = dataPoint.startTimeUnixNano ? nanosToDate(dataPoint.startTimeUnixNano) : null
              const value = dataPoint.asDouble || dataPoint.asInt || dataPoint.sum || dataPoint.count || 0

              // For cumulative metrics (aggregation_temporality = 2) and non-gauge metrics,
              // skip if value hasn't changed. This prevents storing redundant periodic exports
              // of the same cumulative value.
              // Gauges can fluctuate so we always store them, but counters/histograms with
              // cumulative aggregation only increase, so duplicates are wasteful.
              if (aggregationTemporality === 2 || metricType !== 'gauge') {
                const existingMetric = await Metric.findOne({
                  where: {
                    resource_uuid: resource.uuid,
                    name: otlpMetric.name,
                    value: value
                  },
                  order: [['timestamp', 'DESC']],
                  include: metricType === 'histogram' ? [{
                    model: HistogramBucket,
                    as: 'histogram_buckets',
                    attributes: ['bucket_index', 'bucket_count', 'explicit_bound']
                  }] : undefined,
                  transaction
                })

                if (existingMetric) {
                  // For histograms, also check if bucket counts have changed
                  if (metricType === 'histogram' && dataPoint.bucketCounts) {
                    const existingBuckets = (existingMetric as any).histogram_buckets || []
                    const bucketsChanged = existingBuckets.length !== dataPoint.bucketCounts.length ||
                      existingBuckets.some((bucket: any, i: number) =>
                        bucket.bucket_count !== dataPoint.bucketCounts[i]
                      )

                    if (bucketsChanged) {
                      // Bucket counts changed, store this update
                    } else {
                      // Histogram hasn't changed, skip
                      continue
                    }
                  } else {
                    // Non-histogram value hasn't changed, skip this data point
                    continue
                  }
                }
              }

              const metric = await Metric.create({
                resource_uuid: resource.uuid,
                ingest_token_uuid: ingestToken.uuid,
                name: otlpMetric.name,
                description: otlpMetric.description || null,
                unit: otlpMetric.unit || null,
                metric_type: metricType,
                timestamp: timestamp,
                start_timestamp: startTimestamp,
                value: value,
                scope_name: scopeMetric.scope?.name || null,
                scope_version: scopeMetric.scope?.version || null,
                aggregation_temporality: aggregationTemporality,
                is_monotonic: isMonotonic,
                min_value: dataPoint.min || null,
                max_value: dataPoint.max || null,
                count: dataPoint.count || null,
                sum_value: dataPoint.sum || null
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

              // Create histogram buckets if this is a histogram metric
              if (metricType === 'histogram' && dataPoint.bucketCounts && dataPoint.explicitBounds) {
                for (let i = 0; i < dataPoint.bucketCounts.length; i++) {
                  await HistogramBucket.create({
                    metric_uuid: metric.uuid,
                    bucket_index: i,
                    explicit_bound: dataPoint.explicitBounds[i] || null,
                    bucket_count: dataPoint.bucketCounts[i]
                  }, { transaction })
                }
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