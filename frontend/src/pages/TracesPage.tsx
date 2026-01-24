import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../contexts/UserPreferencesContext'
import { useRefresh } from '../contexts/RefreshContext'
import { telemetryService, TracesResponse, Trace } from '../backendService'
import { Pagination, usePagination, SortableHeader, useSort } from '../components/ui/Pagination'
import { format, subHours, subDays } from 'date-fns'

export const TracesPage: React.FC = () => {
  const { token } = useAuth()
  const { refreshTrigger } = useRefresh()
  const queryClient = useQueryClient()
  const { savePreference, getPreference } = useUserPreferences()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Pagination state
  const { page, pageSize, offset, handlePageChange, handlePageSizeChange, resetPage } = usePagination(25)
  const { sortKey, sortDirection, handleSort } = useSort('start_time', 'desc')

  // Load saved time range preference on mount
  useEffect(() => {
    const savedTimeRange = getPreference('traces_time_range', DEFAULT_TIME_RANGE)
    setTimeRange(savedTimeRange)
  }, [getPreference])

  // Save time range preference when it changes
  const handleTimeRangeChange = async (newTimeRange: string) => {
    setTimeRange(newTimeRange)
    resetPage()
    try {
      await savePreference('traces_time_range', newTimeRange)
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

  // Fetch traces with server-side pagination
  const { data: tracesResponse, isLoading, error } = useQuery<TracesResponse>(
    ['traces', timeRange, serviceFilter, statusFilter, page, pageSize, sortKey, sortDirection, refreshTrigger],
    async () => {
      const timeParams = getTimeRange()
      return telemetryService.fetchTraces(token!, {
        ...timeParams,
        limit: pageSize,
        offset,
        sort: sortKey || 'start_time',
        sortDirection,
        service_name: serviceFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })
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
  const handleServiceFilterChange = (value: string) => {
    setServiceFilter(value)
    resetPage()
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    resetPage()
  }

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'ok', label: 'Success' },
    { value: 'error', label: 'Error' },
    { value: 'timeout', label: 'Timeout' },
  ]

  const timeRangeOptions = [
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  const traces = tracesResponse?.traces || []
  const totalCount = tracesResponse?.total_count || 0
  const totalPages = tracesResponse?.total_pages || 0

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header */}
        <Box>
          <Heading size="6">Traces</Heading>
          <Text color="gray">
            Distributed tracing analysis and visualization
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

              {/* Service filter */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Service</Text>
                <TextField.Root
                  placeholder="Filter by service name"
                  value={serviceFilter}
                  onChange={(e) => handleServiceFilterChange(e.target.value)}
                />
              </Flex>

              {/* Status filter */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Status</Text>
                <Select.Root value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <Select.Trigger placeholder="All statuses" style={{ width: '100%' }} />
                  <Select.Content>
                    {statusOptions.map((option) => (
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
                    setServiceFilter('')
                    setStatusFilter('all')
                    resetPage()
                  }}
                >
                  Clear Filters
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Traces table */}
        <Card>
          <Flex direction="column" gap="4">
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '16px' }}>
              <Heading size="4">
                Traces ({totalCount.toLocaleString()})
              </Heading>
            </Box>

            {isLoading && !tracesResponse ? (
              <Flex direction="column" gap="3">
                {[...Array(5)].map((_, i) => (
                  <Box key={i} className="loading-skeleton" style={{ height: '64px', borderRadius: 'var(--radius-2)' }} />
                ))}
              </Flex>
            ) : error ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
                <Text size="2" color="red" style={{ marginTop: '8px' }}>Failed to load traces</Text>
              </Flex>
            ) : traces.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ActivityLogIcon width="48" height="48" color="var(--gray-8)" />
                <Text size="2" color="gray" style={{ marginTop: '8px' }}>No traces found</Text>
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
                          label="Start Time"
                          sortKey="start_time"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Service"
                          sortKey="service_name"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Operation"
                          sortKey="operation_name"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Status"
                          sortKey="status"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Spans"
                          sortKey="span_count"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {traces.map((trace: Trace) => (
                      <Table.Row key={trace.uuid} style={{ cursor: 'pointer' }}>
                        <Table.RowHeaderCell>
                          <Text size="2">{format(new Date(trace.start_time), 'HH:mm:ss')}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="2">{trace.service_name}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{trace.operation_name || '-'}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{trace.duration_ms ? `${trace.duration_ms} ms` : '-'}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            color={trace.status === 'ok' ? 'green' : trace.status === 'error' ? 'red' : 'gray'}
                            variant="soft"
                          >
                            {trace.status || 'unknown'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2" color="gray">{trace.span_count}</Text>
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
