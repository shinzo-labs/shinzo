import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, Card, Flex, Text, Heading, Badge, Grid, Box } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { useRefresh } from '../contexts/RefreshContext'
import { telemetryService, ResourceAnalytics } from '../backendService'
import { subHours, subDays } from 'date-fns'
import { TimeRangePicker, TimeRange } from '../components/charts/TimeRangePicker'
import { TraceTimeSeriesChart } from '../components/charts/TraceTimeSeriesChart'
import { TracePieChart } from '../components/charts/TracePieChart'
import {
  processTracesForTimeSeriesByOperation,
  processTracesForPieByOperation,
  addColorsToData
} from '../utils/chartDataProcessing'

export const ServerAnalyticsPage: React.FC = () => {
  const { token } = useAuth()
  const { refreshTrigger } = useRefresh()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resourceUuid = searchParams.get('resourceId')

  // State for time range
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: subHours(new Date(), 1),
    end: new Date(),
    label: 'Last 1 hour'
  })

  // Helper function to get current time range with updated end time for preset ranges
  const getCurrentTimeRange = (): TimeRange => {
    if (timeRange.label !== 'Custom') {
      const now = new Date()
      switch (timeRange.label) {
        case 'Last 1 hour':
          return { ...timeRange, start: subHours(now, 1), end: now }
        case 'Last 24 hours':
          return { ...timeRange, start: subHours(now, 24), end: now }
        case 'Last 7 days':
          return { ...timeRange, start: subDays(now, 7), end: now }
        case 'Last 30 days':
          return { ...timeRange, start: subDays(now, 30), end: now }
        default:
          return timeRange
      }
    }
    return timeRange
  }

  // Redirect if no resourceUuid
  useEffect(() => {
    if (!resourceUuid) {
      navigate('/dashboard')
    }
  }, [resourceUuid, navigate])

  // Fetch resource analytics
  const { data: analytics, isLoading } = useQuery<ResourceAnalytics | null>(
    ['resource-analytics', resourceUuid, timeRange.label, refreshTrigger],
    async () => {
      if (!resourceUuid) return null
      const currentRange = getCurrentTimeRange()
      return telemetryService.fetchResourceAnalytics(token!, resourceUuid, {
        start_time: currentRange.start.toISOString(),
        end_time: currentRange.end.toISOString(),
      })
    },
    {
      enabled: !!token && !!resourceUuid,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      staleTime: 4000
    }
  )

  // Process chart data
  const operationTimeSeriesData = useMemo(() => {
    if (!analytics?.traces) return {}
    const currentRange = getCurrentTimeRange()
    return processTracesForTimeSeriesByOperation(analytics.traces, currentRange)
  }, [analytics?.traces, timeRange.label, refreshTrigger])

  const operationPieData = useMemo(() => {
    if (!analytics?.traces) return []
    return addColorsToData(processTracesForPieByOperation(analytics.traces))
  }, [analytics?.traces])

  // Stat cards
  const statCards = useMemo(() => {
    if (!analytics) return []
    return [
      {
        title: 'Total Traces',
        value: analytics.metrics.totalTraces.toLocaleString(),
        icon: Icons.ActivityLogIcon,
      },
      {
        title: 'Error Traces',
        value: analytics.metrics.errorTraces.toString(),
        icon: Icons.ExclamationTriangleIcon,
      },
      {
        title: 'Error Rate',
        value: `${analytics.metrics.errorRate.toFixed(2)}%`,
        icon: Icons.CrossCircledIcon,
      },
      {
        title: 'Avg Response Time',
        value: `${analytics.metrics.avgDuration.toFixed(2)}ms`,
        icon: Icons.ClockIcon,
      },
    ]
  }, [analytics])

  if (!resourceUuid) {
    return null
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header with back button */}
        <Flex justify="between" align="center">
          <Flex direction="column" gap="2">
            <Flex align="center" gap="3">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                style={{ cursor: 'pointer' }}
              >
                <Icons.ArrowLeftIcon width="16" height="16" />
                Back to Dashboard
              </Button>
            </Flex>
            <Flex align="center" gap="3">
              <Heading size="6">Server Analytics</Heading>
              {analytics && <Badge color="green" variant="soft">Active</Badge>}
            </Flex>
            <Flex align="center" gap="2">
              <Text size="3" weight="bold">
                {analytics?.resource.service_name || 'Loading...'}
              </Text>
              {(analytics?.resource as any)?.service_version && (
                <Badge variant="outline">{(analytics?.resource as any)?.service_version}</Badge>
              )}
            </Flex>
          </Flex>
          <Flex gap="3" align="center">
            <TimeRangePicker
              currentRange={timeRange}
              onTimeRangeChange={setTimeRange}
              preferenceKey="server_analytics_time_range"
            />
          </Flex>
        </Flex>

        {/* Server metadata card */}
        {analytics && (
          <Card style={{ padding: '24px' }}>
            <Flex direction="column" gap="4">
              <Heading size="4">Server Information</Heading>
              <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                <Box>
                  <Text size="2" color="gray" weight="medium" style={{ marginBottom: '4px', display: 'block' }}>
                    Service Name
                  </Text>
                  <Text size="3" weight="bold">{analytics.resource.service_name}</Text>
                </Box>
                <Box>
                  <Text size="2" color="gray" weight="medium" style={{ marginBottom: '4px', display: 'block' }}>
                    Version
                  </Text>
                  <Text size="3" weight="bold">{(analytics.resource as any).service_version || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text size="2" color="gray" weight="medium" style={{ marginBottom: '4px', display: 'block' }}>
                    First Seen
                  </Text>
                  <Text size="3" weight="bold">{new Date((analytics.resource as any).first_seen).toLocaleString()}</Text>
                </Box>
                <Box>
                  <Text size="2" color="gray" weight="medium" style={{ marginBottom: '4px', display: 'block' }}>
                    Last Seen
                  </Text>
                  <Text size="3" weight="bold">{new Date((analytics.resource as any).last_seen).toLocaleString()}</Text>
                </Box>
              </Grid>
              {Object.keys(analytics.resource.attributes).length > 0 && (
                <Box style={{ borderTop: '1px solid var(--gray-6)', paddingTop: '16px', marginTop: '8px' }}>
                  <Text size="2" color="gray" weight="medium" style={{ marginBottom: '8px', display: 'block' }}>
                    Attributes
                  </Text>
                  <Flex direction="column" gap="2">
                    {Object.entries(analytics.resource.attributes).map(([key, value]) => (
                      <Flex key={key} justify="between" align="center">
                        <Text size="2" color="gray">{key}</Text>
                        <Badge variant="soft">{String(value)}</Badge>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Card>
        )}

        {/* Quick stats cards */}
        {!isLoading && analytics && (
          <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title} style={{ padding: '20px' }}>
                  <Flex align="center" gap="4">
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'var(--blue-3)',
                        borderRadius: 'var(--radius-2)',
                        color: 'var(--blue-9)'
                      }}
                    >
                      <Icon width="24" height="24" />
                    </Flex>
                    <Box style={{ flex: 1 }}>
                      <Text size="2" color="gray" weight="medium" style={{ marginBottom: '4px', display: 'block' }}>{stat.title}</Text>
                      <Text size="6" weight="bold" style={{ marginBottom: '8px', display: 'block' }}>{stat.value}</Text>
                    </Box>
                  </Flex>
                </Card>
              )
            })}
          </Grid>
        )}

        {/* Charts Section */}
        {!isLoading && analytics && (
          <Flex direction="column" gap="4">
            <Box>
              <Heading size="4">Tool Call Analytics</Heading>
              <Text size="2" color="gray">Detailed telemetry visualization for {timeRange.label.toLowerCase()}</Text>
            </Box>

            {/* Charts row */}
            <Grid columns={{ initial: '1', lg: '2' }} gap="4">
              <TraceTimeSeriesChart
                key="operation-timeseries"
                title="Tool Calls Over Time"
                data={operationTimeSeriesData}
                height={300}
              />
              <TracePieChart
                key="operation-pie"
                title="Tool Call Distribution"
                data={operationPieData}
                height={300}
                groupBy="tool"
                traces={analytics.traces}
              />
            </Grid>
          </Flex>
        )}

        {/* Loading state */}
        {isLoading && (
          <Flex direction="column" gap="4" align="center" justify="center" style={{ padding: '64px 0' }}>
            <Text size="3" color="gray">Loading server analytics...</Text>
          </Flex>
        )}

        {/* No data state */}
        {!isLoading && analytics && analytics.traces.length === 0 && (
          <Card style={{ padding: '64px' }}>
            <Flex direction="column" align="center" justify="center" style={{ textAlign: 'center' }}>
              <Icons.BarChartIcon width="48" height="48" color="var(--gray-8)" />
              <Text size="3" color="gray" style={{ marginTop: '16px' }}>No telemetry data found for this time range</Text>
              <Text size="2" color="gray">
                Try adjusting the time range or make some tool calls to see analytics
              </Text>
            </Flex>
          </Card>
        )}
      </Flex>
    </AppLayout>
  )
}
