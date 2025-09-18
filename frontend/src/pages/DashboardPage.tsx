import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, Card, Flex, Text, Heading, Badge, Grid, Box } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { API_BASE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { telemetryService, ingestTokenService } from '../backendService'
import { subHours } from 'date-fns'
import { TimeRangePicker, TimeRange } from '../components/charts/TimeRangePicker'
import { TraceTimeSeriesChart } from '../components/charts/TraceTimeSeriesChart'
import { TracePieChart } from '../components/charts/TracePieChart'
import { WelcomeBanner } from '../components/WelcomeBanner'
import {
  processTracesForTimeSeriesByOperation,
  processTracesForTimeSeriesBySession,
  processTracesForPieByOperation,
  processTracesForPieBySession,
  addColorsToData
} from '../utils/chartDataProcessing'

interface DashboardStats {
  totalTraces: number
  activeServices: number
  errorRate: number
  avgResponseTime: number
}

export const DashboardPage: React.FC = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)

  // State for time range
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: subHours(new Date(), 1),
    end: new Date(),
    label: 'Last 1 hour'
  })

  // Check if user should see welcome banner (new user with fresh token)
  useEffect(() => {
    const checkForWelcomeBanner = async () => {
      if (token) {
        try {
          const tokens = await ingestTokenService.fetchAll(token)
          if (tokens.length === 1) {
            // If user has exactly one token, they might be new
            const tokenAge = new Date().getTime() - new Date(tokens[0].created_at).getTime()
            const oneHourInMs = 60 * 60 * 1000

            // Show banner if token was created within the last hour and banner hasn't been dismissed
            if (tokenAge < oneHourInMs && !localStorage.getItem('welcomeBannerDismissed')) {
              setShowWelcomeBanner(true)
            }
          }
        } catch (error) {
          console.error('Failed to check for welcome banner:', error)
        }
      }
    }
    checkForWelcomeBanner()
  }, [token])

  const handleDismissWelcomeBanner = () => {
    setShowWelcomeBanner(false)
    localStorage.setItem('welcomeBannerDismissed', 'true')
  }

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery(
    'resources',
    async () => {
      const response = await fetch(`${API_BASE_URL}/telemetry/fetch_resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch resources')
      return response.json()
    },
    { enabled: !!token }
  )

  // Fetch traces for the selected time range for charts
  const { data: traces = [] } = useQuery(
    ['dashboard-traces', timeRange.start.toISOString(), timeRange.end.toISOString()],
    async () => {
      return telemetryService.fetchTraces(token!, {
        start_time: timeRange.start.toISOString(),
        end_time: timeRange.end.toISOString(),
      })
    },
    { enabled: !!token }
  )

  // Fetch traces for last 24 hours to calculate stats
  const { data: statsTraces = [] } = useQuery(
    'dashboard-stats-traces',
    async () => {
      const end = new Date()
      const start = subHours(end, 24)
      return telemetryService.fetchTraces(token!, {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
    },
    { enabled: !!token }
  )

  // Calculate real stats from last 24 hours data
  const stats: DashboardStats = {
    totalTraces: statsTraces.length,
    activeServices: resources.length,
    errorRate: statsTraces.length > 0
      ? (statsTraces.filter((trace: any) => trace.status === 'error').length / statsTraces.length) * 100
      : 0,
    avgResponseTime: statsTraces.length > 0
      ? statsTraces.reduce((sum: number, trace: any) => sum + (trace.duration_ms || 0), 0) / statsTraces.length
      : 0,
  }

  // Process chart data
  const operationTimeSeriesData = processTracesForTimeSeriesByOperation(traces, timeRange)
  const sessionTimeSeriesData = processTracesForTimeSeriesBySession(traces, timeRange)
  const operationPieData = addColorsToData(processTracesForPieByOperation(traces))
  const sessionPieData = addColorsToData(processTracesForPieBySession(traces))

  const statCards = [
    {
      title: 'Total Traces',
      value: stats.totalTraces.toLocaleString(),
      subtitle: 'Last 24 hours',
      icon: Icons.ActivityLogIcon,
    },
    {
      title: 'Active Services',
      value: stats.activeServices.toString(),
      subtitle: 'Currently running',
      icon: Icons.ComponentInstanceIcon,
    },
    {
      title: 'Error Rate',
      value: `${stats.errorRate.toFixed(2)}%`,
      subtitle: 'Last 24 hours',
      icon: Icons.ExclamationTriangleIcon,
    },
    {
      title: 'Avg Response Time',
      value: `${stats.avgResponseTime.toFixed(2)}ms`,
      subtitle: 'Last 24 hours',
      icon: Icons.ClockIcon,
    },
  ]

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Welcome Banner for new users */}
        {showWelcomeBanner && (
          <WelcomeBanner onDismiss={handleDismissWelcomeBanner} />
        )}

        {/* Page header */}
        <Flex justify="between" align="center">
          <Box>
            <Heading size="6">Dashboard</Heading>
            <Text color="gray">
              Overview of your telemetry data and system health
            </Text>
          </Box>
          <Flex gap="3" align="center">
            <TimeRangePicker
              currentRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries('resources')
                queryClient.invalidateQueries(['dashboard-traces'])
                queryClient.invalidateQueries('dashboard-stats-traces')
              }}
            >
              <Icons.ReloadIcon />
              Refresh
            </Button>
          </Flex>
        </Flex>

        {/* Quick stats cards */}
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
                <Flex justify="start" align="center" style={{ marginTop: '20px' }}>
                  <Text size="2" color="gray">{stat.subtitle}</Text>
                </Flex>
              </Card>
            )
          })}
        </Grid>

        {/* Service overview */}
        <Card style={{ padding: '24px' }}>
          <Flex direction="column" gap="6">
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '20px' }}>
              <Heading size="4" style={{ marginBottom: '8px' }}>Services</Heading>
              <Text size="2" color="gray">Active services and their status</Text>
            </Box>
            <Box>
              {resourcesLoading ? (
                <Flex direction="column" gap="3">
                  {[...Array(3)].map((_, i) => (
                    <Box key={i} className="loading-skeleton" style={{ height: '64px', borderRadius: 'var(--radius-2)' }} />
                  ))}
                </Flex>
              ) : resources.length > 0 ? (
                <Flex direction="column" gap="5">
                  {resources.slice(0, 5).map((resource: any) => (
                    <Flex key={resource.uuid} justify="between" align="center" style={{ padding: '8px 0' }}>
                      <Flex align="center" gap="4">
                        <Badge color="green" variant="soft" style={{ width: '8px', height: '8px', padding: 0 }} />
                        <Box>
                          <Text size="2" weight="medium" style={{ marginBottom: '2px', display: 'block' }}>
                            {resource.service_name}
                          </Text>
                          <Text size="1" color="gray">
                            {resource.service_version || 'No version'}
                          </Text>
                        </Box>
                      </Flex>
                      <Text size="1" color="gray">
                        Last seen: {new Date(resource.last_seen).toLocaleTimeString()}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              ) : (
                <Flex direction="column" align="center" justify="center" style={{ padding: '32px 0', textAlign: 'center' }}>
                  <Icons.ComponentInstanceIcon width="48" height="48" color="var(--gray-8)" />
                  <Text size="2" color="gray" style={{ marginTop: '8px' }}>No services found</Text>
                  <Text size="1" color="gray">
                    Services will appear here once telemetry data is ingested
                  </Text>
                </Flex>
              )}
            </Box>
          </Flex>
        </Card>

        {/* Charts Section */}
        <Flex direction="column" gap="4">
          <Box>
            <Heading size="4">Analytics</Heading>
            <Text size="2" color="gray">Telemetry data visualization for {timeRange.label.toLowerCase()}</Text>
          </Box>

          {/* Top row - Line charts */}
          <Grid columns={{ initial: '1', lg: '2' }} gap="4">
            <TraceTimeSeriesChart
              title="Trace Count by Operation"
              data={operationTimeSeriesData}
              height={300}
            />
            <TraceTimeSeriesChart
              title="Trace Count by Session ID"
              data={sessionTimeSeriesData}
              height={300}
            />
          </Grid>

          {/* Bottom row - Pie charts */}
          <Grid columns={{ initial: '1', lg: '2' }} gap="4">
            <TracePieChart
              title="Traces by Operation"
              data={operationPieData}
              height={300}
            />
            <TracePieChart
              title="Traces by Session ID"
              data={sessionPieData}
              height={300}
            />
          </Grid>
        </Flex>

      </Flex>
    </AppLayout>
  )
}