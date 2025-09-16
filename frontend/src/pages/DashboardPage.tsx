import React from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, Card, Flex, Text, Heading, Badge, Grid, Box } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { API_BASE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { telemetryService } from '../backendService'
import { subHours } from 'date-fns'

interface DashboardStats {
  totalTraces: number
  activeServices: number
  errorRate: number
  avgResponseTime: number
}

export const DashboardPage: React.FC = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

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

  // Fetch traces for last 24 hours to calculate stats
  const { data: traces = [] } = useQuery(
    'dashboard-traces',
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

  // Calculate real stats from actual data
  const stats: DashboardStats = {
    totalTraces: traces.length,
    activeServices: resources.length,
    errorRate: traces.length > 0
      ? (traces.filter((trace: any) => trace.status === 'error').length / traces.length) * 100
      : 0,
    avgResponseTime: traces.length > 0
      ? traces.reduce((sum: number, trace: any) => sum + (trace.duration_ms || 0), 0) / traces.length
      : 0,
  }

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
      value: `${stats.avgResponseTime}ms`,
      subtitle: 'Last 24 hours',
      icon: Icons.ClockIcon,
    },
  ]

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header */}
        <Flex justify="between" align="center">
          <Box>
            <Heading size="6">Dashboard</Heading>
            <Text color="gray">
              Overview of your telemetry data and system health
            </Text>
          </Box>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries('resources')
              queryClient.invalidateQueries('dashboard-traces')
            }}
          >
            <Icons.ReloadIcon />
            Refresh
          </Button>
        </Flex>

        {/* Quick stats cards */}
        <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <Flex align="center" gap="3">
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: 'var(--blue-3)',
                      borderRadius: 'var(--radius-2)',
                      color: 'var(--blue-9)'
                    }}
                  >
                    <Icon width="20" height="20" />
                  </Flex>
                  <Box style={{ flex: 1 }}>
                    <Text size="2" color="gray" weight="medium">{stat.title}</Text>
                    <Text size="6" weight="bold">{stat.value}</Text>
                  </Box>
                </Flex>
                <Flex justify="start" align="center" style={{ marginTop: '16px' }}>
                  <Text size="2" color="gray">{stat.subtitle}</Text>
                </Flex>
              </Card>
            )
          })}
        </Grid>

        {/* Service overview */}
        <Card>
          <Flex direction="column" gap="4">
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '16px' }}>
              <Heading size="4">Services</Heading>
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
                <Flex direction="column" gap="4">
                  {resources.slice(0, 5).map((resource: any) => (
                    <Flex key={resource.uuid} justify="between" align="center">
                      <Flex align="center" gap="3">
                        <Badge color="green" variant="soft" style={{ width: '8px', height: '8px', padding: 0 }} />
                        <Box>
                          <Text size="2" weight="medium">
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
                  )}
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

      </Flex>
    </AppLayout>
  )
}