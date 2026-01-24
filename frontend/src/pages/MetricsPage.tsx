import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../contexts/UserPreferencesContext'
import { useRefresh } from '../contexts/RefreshContext'
import { telemetryService, Metric } from '../backendService'
import { Pagination, usePagination, SortableHeader, useSort } from '../components/ui/Pagination'
import { format, subHours, subDays } from 'date-fns'

export const MetricsPage: React.FC = () => {
  const { token } = useAuth()
  const { refreshTrigger } = useRefresh()
  const queryClient = useQueryClient()
  const { savePreference, getPreference } = useUserPreferences()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [metricNameFilter, setMetricNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Pagination state (client-side)
  const { page, pageSize, handlePageChange, handlePageSizeChange, resetPage } = usePagination(25)
  const { sortKey, sortDirection, handleSort } = useSort('timestamp', 'desc')

  // Load saved time range preference on mount
  useEffect(() => {
    const savedTimeRange = getPreference('metrics_time_range', DEFAULT_TIME_RANGE)
    setTimeRange(savedTimeRange)
  }, [getPreference])

  // Save time range preference when it changes
  const handleTimeRangeChange = async (newTimeRange: string) => {
    setTimeRange(newTimeRange)
    resetPage()
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
      staleTime: 4000
    }
  )

  // Handle sort changes
  const handleSortColumn = (column: string) => {
    handleSort(column)
    resetPage()
  }

  // Handle filter changes
  const handleMetricNameFilterChange = (value: string) => {
    setMetricNameFilter(value)
    resetPage()
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    resetPage()
  }

  // Filter and sort metrics (client-side)
  const filteredAndSortedMetrics = useMemo(() => {
    let result = metrics.filter((metric: Metric) => {
      if (metricNameFilter && !metric.name.toLowerCase().includes(metricNameFilter.toLowerCase())) {
        return false
      }
      if (typeFilter && typeFilter !== 'all' && metric.metric_type !== typeFilter) {
        return false
      }
      return true
    })

    // Sort
    if (sortKey) {
      result = [...result].sort((a: Metric, b: Metric) => {
        let aVal: any, bVal: any
        switch (sortKey) {
          case 'timestamp':
            aVal = new Date(a.timestamp).getTime()
            bVal = new Date(b.timestamp).getTime()
            break
          case 'name':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'metric_type':
            aVal = a.metric_type
            bVal = b.metric_type
            break
          case 'value':
            aVal = a.value
            bVal = b.value
            break
          default:
            return 0
        }
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
    }

    return result
  }, [metrics, metricNameFilter, typeFilter, sortKey, sortDirection])

  // Paginate results (client-side)
  const totalCount = filteredAndSortedMetrics.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedMetrics = filteredAndSortedMetrics.slice((page - 1) * pageSize, page * pageSize)

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
                  onChange={(e) => handleMetricNameFilterChange(e.target.value)}
                />
              </Flex>

              {/* Type filter */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Type</Text>
                <Select.Root value={typeFilter} onValueChange={handleTypeFilterChange}>
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
                    resetPage()
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
                Metrics ({totalCount.toLocaleString()})
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
            ) : paginatedMetrics.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.BarChartIcon width="48" height="48" color="var(--gray-8)" />
                <Text size="2" color="gray" style={{ marginTop: '8px' }}>No metrics found</Text>
                <Text size="1" color="gray">
                  Try adjusting your filters or time range
                </Text>
              </Flex>
            ) : (
              <>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Timestamp"
                          sortKey="timestamp"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Metric Name"
                          sortKey="name"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Type"
                          sortKey="metric_type"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Value"
                          sortKey="value"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Unit</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedMetrics.map((metric: Metric) => (
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

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  isLoading={isLoading}
                />
              </>
            )}
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  )
}
