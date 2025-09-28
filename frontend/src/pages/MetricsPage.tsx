import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../contexts/UserPreferencesContext'
import { useRefresh } from '../contexts/RefreshContext'
import { telemetryService } from '../backendService'
import { format, subHours, subDays } from 'date-fns'

interface Metric {
  uuid: string
  name: string
  description: string | null
  unit: string | null
  metric_type: string
  timestamp: string
  value: number
  scope_name: string | null
  scope_version: string | null
  created_at: string
  updated_at: string
  attributes: Array<{
    key: string
    value: string
  }>
}

export const MetricsPage: React.FC = () => {
  const { token } = useAuth()
  const { refreshTrigger } = useRefresh()
  const queryClient = useQueryClient()
  const { savePreference, getPreference } = useUserPreferences()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [metricNameFilter, setMetricNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Load saved time range preference on mount
  useEffect(() => {
    const savedTimeRange = getPreference('metrics_time_range', DEFAULT_TIME_RANGE)
    setTimeRange(savedTimeRange)
  }, [getPreference])

  // Save time range preference when it changes
  const handleTimeRangeChange = async (newTimeRange: string) => {
    setTimeRange(newTimeRange)
    try {
      await savePreference('metrics_time_range', newTimeRange)
    } catch (error) {
      console.error('Failed to save time range preference:', error)
    }
  }

  // Calculate time range
  const getTimeRange = () => {
    const end = new Date()
    let start = new Date()

    switch (timeRange) {
      case '1h':
        start = subHours(end, 1)
        break
      case '24h':
        start = subHours(end, 24)
        break
      case '7d':
        start = subDays(end, 7)
        break
      case '30d':
        start = subDays(end, 30)
        break
      default:
        start = subHours(end, 1)
    }

    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    }
  }

  // Fetch metrics
  const { data: metrics = [], isLoading, error } = useQuery(
    ['metrics', timeRange, refreshTrigger],
    async () => {
      const timeParams = getTimeRange()
      return telemetryService.fetchMetrics(token!, timeParams)
    },
    {
      enabled: !!token,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      staleTime: 4000 // Consider data fresh for 4 seconds (just under the 5s refresh interval)
    }
  )

  // Refresh function for manual refresh
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries(['metrics', timeRange, refreshTrigger])
  }, [queryClient, timeRange, refreshTrigger])

  // Filter metrics
  const filteredMetrics = metrics.filter((metric: Metric) => {
    if (metricNameFilter && !metric.name.toLowerCase().includes(metricNameFilter.toLowerCase())) {
      return false
    }
    if (typeFilter && typeFilter !== 'all' && metric.metric_type !== typeFilter) {
      return false
    }
    return true
  })

  const timeRangeOptions = [
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  const typeOptions = [
    { value: 'all', label: 'All types' },
    { value: 'counter', label: 'Counter' },
    { value: 'gauge', label: 'Gauge' },
    { value: 'histogram', label: 'Histogram' },
    { value: 'summary', label: 'Summary' },
  ]

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header */}
        <Box>
          <Heading size="6">Metrics</Heading>
          <Text color="gray">
            Application metrics and performance indicators
          </Text>
        </Box>

        {/* Filters */}
        <Card>
          <Flex direction="column" gap="4">
            <Text size="3" weight="medium">Filters</Text>
            <Flex gap="4" wrap="wrap">
              {/* Time range */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Time Range</Text>
                <Select.Root value={timeRange} onValueChange={handleTimeRangeChange}>
                  <Select.Trigger placeholder="Select time range" style={{ width: '100%' }} />
                  <Select.Content>
                    {timeRangeOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Metric name filter */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Metric Name</Text>
                <TextField.Root
                  placeholder="Filter by metric name"
                  value={metricNameFilter}
                  onChange={(e) => setMetricNameFilter(e.target.value)}
                />
              </Flex>

              {/* Type filter */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Type</Text>
                <Select.Root value={typeFilter} onValueChange={setTypeFilter}>
                  <Select.Trigger placeholder="All types" style={{ width: '100%' }} />
                  <Select.Content>
                    {typeOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Clear filters */}
              <Flex direction="column" justify="end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMetricNameFilter('')
                    setTypeFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Metrics table */}
        <Card>
          <Flex direction="column" gap="4">
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '16px' }}>
              <Heading size="4">
                Metrics ({filteredMetrics.length})
              </Heading>
            </Box>

            {isLoading ? (
              <Flex direction="column" gap="3">
                {[...Array(5)].map((_, i) => (
                  <Box key={i} className="loading-skeleton" style={{ height: '64px', borderRadius: 'var(--radius-2)' }} />
                ))}
              </Flex>
            ) : error ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
                <Text size="2" color="red" style={{ marginTop: '8px' }}>Failed to load metrics</Text>
              </Flex>
            ) : filteredMetrics.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.BarChartIcon width="48" height="48" color="var(--gray-8)" />
                <Text size="2" color="gray" style={{ marginTop: '8px' }}>No metrics found</Text>
                <Text size="1" color="gray">
                  Try adjusting your filters or time range
                </Text>
              </Flex>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Metric Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Unit</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredMetrics.map((metric: Metric) => (
                    <Table.Row key={metric.uuid}>
                      <Table.RowHeaderCell>
                        <Text size="2">{format(new Date(metric.timestamp), 'HH:mm:ss.SSS')}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" weight="medium">{metric.name}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={
                            metric.metric_type === 'counter' ? 'blue' :
                            metric.metric_type === 'gauge' ? 'green' :
                            metric.metric_type === 'histogram' ? 'purple' : 'gray'
                          }
                          variant="soft"
                        >
                          {metric.metric_type}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" style={{ fontFamily: 'var(--default-font-family-mono)' }}>
                          {metric.value.toLocaleString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">{metric.unit || '-'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray" style={{ maxWidth: '200px' }} truncate>
                          {metric.description || '-'}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  )
}