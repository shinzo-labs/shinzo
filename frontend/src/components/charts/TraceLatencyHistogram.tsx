import React, { useRef, useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, Heading, Text, Box, Flex, Badge, Grid } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { chartPropsEqual } from '../../utils/chartUtils'

interface Span {
  uuid: string
  trace_uuid: string
  parent_span_uuid: string | null
  start_time: string
  end_time: string | null
  service_name: string
  operation_name: string | null
  status_code: number | null
  status_message: string | null
  span_kind: string | null
  duration_ms: number | null
  created_at: string
  updated_at: string
  attributes: Record<string, any>
}

interface TraceLatencyHistogramProps {
  title: string
  data: any[]
  height?: number
}

interface HistogramBucket {
  range: string
  minMs: number
  maxMs: number
  [operationName: string]: number | string // Dynamic properties for each operation count
}

const chartColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98',
  '#f0e68c', '#ff6347', '#40e0d0', '#ee82ee', '#90ee90'
]

const cleanOperationName = (operationName: string | null): string => {
  if (!operationName) return 'Unknown'
  // Split on space, remove first element, rejoin
  const parts = operationName.split(' ')
  if (parts.length <= 1) return operationName
  return parts.slice(1).join(' ')
}

const TraceLatencyHistogramComponent: React.FC<TraceLatencyHistogramProps> = ({
  title,
  data: spans,
  height = 300
}) => {
  const hasAnimatedRef = useRef(false)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)

  // Mark as animated after first render
  useEffect(() => {
    if (!hasAnimatedRef.current && spans.length > 0) {
      hasAnimatedRef.current = true
    }
  }, [spans.length])

  // Get unique operations from spans
  const operations = useMemo(() => {
    const validSpans = spans.filter(span => span.duration_ms !== null && span.duration_ms !== undefined && span.duration_ms >= 0)
    const operationSet = new Set(validSpans.map(span => cleanOperationName(span.operation_name)))
    return Array.from(operationSet).sort()
  }, [spans])

  // Process spans into histogram buckets with operation breakdown
  const { histogramData, operationStats } = useMemo(() => {
    // Filter spans with valid duration
    const validSpans = spans.filter(span => span.duration_ms !== null && span.duration_ms !== undefined && span.duration_ms >= 0)

    if (validSpans.length === 0) {
      return { histogramData: [], operationStats: {} }
    }

    // Find min and max latency across all spans
    const latencies = validSpans.map(span => span.duration_ms!)
    const minLatency = Math.min(...latencies)
    const maxLatency = Math.max(...latencies)

    // Determine bucket size and count
    // Use logarithmic buckets for better distribution across wide ranges
    const logMin = Math.log10(Math.max(minLatency, 1))
    const logMax = Math.log10(Math.max(maxLatency, 1))
    const bucketCount = 10

    const buckets: HistogramBucket[] = []

    // Create logarithmic buckets
    for (let i = 0; i < bucketCount; i++) {
      const logStart = logMin + (i * (logMax - logMin) / bucketCount)
      const logEnd = logMin + ((i + 1) * (logMax - logMin) / bucketCount)
      const start = Math.pow(10, logStart)
      const end = Math.pow(10, logEnd)

      // Format range label
      let rangeLabel: string
      if (start < 1) {
        rangeLabel = `${start.toFixed(2)}-${end.toFixed(2)}`
      } else if (start < 1000) {
        rangeLabel = `${Math.round(start)}-${Math.round(end)}`
      } else {
        rangeLabel = `${(start / 1000).toFixed(1)}k-${(end / 1000).toFixed(1)}k`
      }

      const bucket: HistogramBucket = {
        range: rangeLabel,
        minMs: start,
        maxMs: end
      }

      // Count spans for each operation in this bucket
      let totalCount = 0
      operations.forEach(operation => {
        const operationSpans = validSpans.filter(span => cleanOperationName(span.operation_name) === operation)
        const count = operationSpans.filter(span => {
          const duration = span.duration_ms!
          return duration >= start && (i === bucketCount - 1 ? duration <= end : duration < end)
        }).length
        bucket[operation] = count
        totalCount += count
      })
      
      bucket.total = totalCount
      buckets.push(bucket)
    }

    // Filter out empty buckets at the edges
    const hasData = (bucket: HistogramBucket) => operations.some(op => (bucket[op] as number) > 0)
    let firstNonEmpty = buckets.findIndex(hasData)
    let lastNonEmpty = buckets.length - 1 - [...buckets].reverse().findIndex(hasData)

    if (firstNonEmpty === -1) {
      return { histogramData: [], operationStats: {} }
    }

    const filteredBuckets = buckets.slice(firstNonEmpty, lastNonEmpty + 1)

    // Calculate operation statistics
    const stats: Record<string, { total: number; avg: number; median: number; p95: number }> = {}
    operations.forEach(operation => {
      const operationSpans = validSpans.filter(span => cleanOperationName(span.operation_name) === operation)
      if (operationSpans.length > 0) {
        const durations = operationSpans.map(span => span.duration_ms!).sort((a, b) => a - b)
        const total = operationSpans.length
        const avg = durations.reduce((sum, d) => sum + d, 0) / total
        const median = durations.length % 2 === 0
          ? (durations[Math.floor(durations.length / 2) - 1] + durations[Math.floor(durations.length / 2)]) / 2
          : durations[Math.floor(durations.length / 2)]
        const p95Index = Math.ceil(durations.length * 0.95) - 1
        const p95 = durations[p95Index]
        
        stats[operation] = { total, avg, median, p95 }
      }
    })

    return { histogramData: filteredBuckets, operationStats: stats }
  }, [spans, operations])

  // Overall statistics
  const overallStats = useMemo(() => {
    const validSpans = spans.filter(span => span.duration_ms !== null && span.duration_ms !== undefined && span.duration_ms >= 0)
    if (validSpans.length === 0) return { total: 0, avg: 0, median: 0, p95: 0 }

    const durations = validSpans.map(span => span.duration_ms!).sort((a, b) => a - b)
    const total = validSpans.length
    const avg = durations.reduce((sum, d) => sum + d, 0) / total
    const median = durations.length % 2 === 0
      ? (durations[Math.floor(durations.length / 2) - 1] + durations[Math.floor(durations.length / 2)]) / 2
      : durations[Math.floor(durations.length / 2)]
    const p95Index = Math.ceil(durations.length * 0.95) - 1
    const p95 = durations[p95Index]

    return { total, avg, median, p95 }
  }, [spans])

  // Show all operations in the chart
  const displayOperations = useMemo(() => {
    return operations
  }, [operations])

  const formatTooltipValue = (value: number, name: string, props: any) => {
    const bucket = histogramData.find(b => b.range === props.payload.range)
    if (!bucket) return [`${value} calls`, name]

    const operationTotal = operationStats[name]?.total || 0
    const percentage = operationTotal > 0 ? ((value / operationTotal) * 100).toFixed(2) : '0.00'
    return [
      `${value} calls (${percentage}%)`,
      `${name}: ${bucket.minMs.toFixed(2)}-${bucket.maxMs.toFixed(2)} ms`
    ]
  }


  return (
    <Card>
      <Box style={{ padding: '16px' }}>
        <Heading size="4" style={{ marginBottom: '4px' }}>{title}</Heading>
        <Text size="2" color="gray" style={{ marginBottom: '16px' }}>
          Distribution of tool call latencies by tool type
        </Text>

        {histogramData.length === 0 ? (
          <Flex direction="column" align="center" justify="center" style={{ height, textAlign: 'center' }}>
            <Text size="2" color="gray">No latency data available</Text>
          </Flex>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={histogramData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                id={`histogram-${title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-6)" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12, fill: 'var(--gray-11)' }}
                  axisLine={{ stroke: 'var(--gray-6)' }}
                  tickLine={{ stroke: 'var(--gray-6)' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  label={{ value: 'Latency (ms)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fill: 'var(--gray-11)' } }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--gray-11)' }}
                  axisLine={{ stroke: 'var(--gray-6)' }}
                  tickLine={{ stroke: 'var(--gray-6)' }}
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--gray-11)' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-panel-solid)',
                    border: '1px solid var(--gray-6)',
                    borderRadius: 'var(--radius-2)',
                    color: 'var(--gray-12)'
                  }}
                  wrapperStyle={{
                    zIndex: 1000
                  }}
                  formatter={formatTooltipValue}
                />
                {displayOperations.map((operation, index) => (
                  <Bar
                    key={operation}
                    dataKey={operation}
                    stackId="operations"
                    fill={chartColors[index % chartColors.length]}
                    isAnimationActive={!hasAnimatedRef.current}
                    radius={index === displayOperations.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
                <Legend />
              </BarChart>
            </ResponsiveContainer>

            {/* Statistics summary - collapsible */}
            <Box style={{
              marginTop: '16px',
              borderTop: '1px solid var(--gray-6)',
              paddingTop: '12px'
            }}>
              <Flex
                justify="between"
                align="center"
                style={{
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: 'var(--radius-2)',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Flex align="center" gap="2">
                  {isStatsExpanded ? (
                    <Icons.ChevronDownIcon width="16" height="16" />
                  ) : (
                    <Icons.ChevronRightIcon width="16" height="16" />
                  )}
                  <Text size="2" weight="medium">Statistics</Text>
                </Flex>
                {!isStatsExpanded && (
                  <Flex gap="6">
                    <Flex direction="column" gap="1" align="end">
                      <Text size="1" color="gray">Total</Text>
                      <Text size="2" weight="bold">{overallStats.total}</Text>
                    </Flex>
                    <Flex direction="column" gap="1" align="end">
                      <Text size="1" color="gray">Avg</Text>
                      <Text size="2" weight="bold">{overallStats.avg.toFixed(2)} ms</Text>
                    </Flex>
                    <Flex direction="column" gap="1" align="end">
                      <Text size="1" color="gray">Median</Text>
                      <Text size="2" weight="bold">{overallStats.median.toFixed(2)} ms</Text>
                    </Flex>
                    <Flex direction="column" gap="1" align="end">
                      <Text size="1" color="gray">P95</Text>
                      <Text size="2" weight="bold">{overallStats.p95.toFixed(2)} ms</Text>
                    </Flex>
                  </Flex>
                )}
              </Flex>

              {isStatsExpanded && displayOperations.length > 0 && (
                <Grid columns="4" gap="3" style={{ marginTop: '12px' }}>
                  {displayOperations.map((operation, index) => {
                    const stats = operationStats[operation]
                    if (!stats) return null
                    return (
                      <Box key={operation} style={{
                        padding: '12px',
                        backgroundColor: 'var(--gray-2)',
                        borderRadius: 'var(--radius-2)',
                        borderLeft: `4px solid ${chartColors[index % chartColors.length]}`
                      }}>
                        <Text size="2" weight="bold" style={{ marginBottom: '8px', display: 'block' }}>
                          {operation}
                        </Text>
                        <Flex direction="column" gap="2">
                          <Flex justify="between">
                            <Text size="1" color="gray">Total Calls</Text>
                            <Text size="1" weight="bold">{stats.total}</Text>
                          </Flex>
                          <Flex justify="between">
                            <Text size="1" color="gray">Average</Text>
                            <Text size="1" weight="bold">{stats.avg.toFixed(2)} ms</Text>
                          </Flex>
                          <Flex justify="between">
                            <Text size="1" color="gray">Median</Text>
                            <Text size="1" weight="bold">{stats.median.toFixed(2)} ms</Text>
                          </Flex>
                          <Flex justify="between">
                            <Text size="1" color="gray">P95</Text>
                            <Text size="1" weight="bold">{stats.p95.toFixed(2)} ms</Text>
                          </Flex>
                        </Flex>
                      </Box>
                    )
                  })}
                </Grid>
              )}
            </Box>
          </>
        )}
      </Box>
    </Card>
  )
}

export const TraceLatencyHistogram = React.memo(TraceLatencyHistogramComponent, chartPropsEqual)
