import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../contexts/UserPreferencesContext'
import { useRefresh } from '../contexts/RefreshContext'
import { telemetryService, SpansResponse, Span } from '../backendService'
import { Pagination, usePagination, SortableHeader, useSort } from '../components/ui/Pagination'
import { format, subHours, subDays } from 'date-fns'

export const SpansPage: React.FC = () => {
  const { token } = useAuth()
  const { refreshTrigger } = useRefresh()
  const queryClient = useQueryClient()
  const { savePreference, getPreference } = useUserPreferences()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [traceIdFilter, setTraceIdFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')

  // Pagination state
  const { page, pageSize, offset, handlePageChange, handlePageSizeChange, resetPage } = usePagination(25)
  const { sortKey, sortDirection, handleSort } = useSort('start_time', 'desc')

  // Load saved time range preference on mount
  useEffect(() => {
    const savedTimeRange = getPreference('spans_time_range', DEFAULT_TIME_RANGE)
    setTimeRange(savedTimeRange)
  }, [getPreference])

  // Save time range preference when it changes
  const handleTimeRangeChange = async (newTimeRange: string) => {
    setTimeRange(newTimeRange)
    resetPage()
    try {
      await savePreference('spans_time_range', newTimeRange)
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

  // Fetch spans with server-side pagination
  const { data: spansResponse, isLoading, error } = useQuery<SpansResponse>(
    ['spans', timeRange, serviceFilter, page, pageSize, sortKey, sortDirection, refreshTrigger],
    async () => {
      const timeParams = getTimeRange()
      return telemetryService.fetchSpans(token!, {
        ...timeParams,
        limit: pageSize,
        offset,
        sort: sortKey || 'start_time',
        sortDirection,
        service_name: serviceFilter || undefined
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

  // Filter spans by trace ID (client-side since it's not in backend filter)
  const allSpans = spansResponse?.spans || []
  const filteredSpans = traceIdFilter
    ? allSpans.filter(span => span.trace_uuid.includes(traceIdFilter))
    : allSpans

  const totalCount = spansResponse?.total_count || 0
  const totalPages = spansResponse?.total_pages || 0

  const timeRangeOptions = [
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header */}
        <Box>
          <Heading size="6">Spans</Heading>
          <Text color="gray">
            Individual span analysis and debugging
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

              {/* Trace ID */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Trace ID</Text>
                <TextField.Root
                  placeholder="Filter by trace ID"
                  value={traceIdFilter}
                  onChange={(e) => setTraceIdFilter(e.target.value)}
                />
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

              {/* Clear filters */}
              <Flex direction="column" justify="end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTraceIdFilter('')
                    setServiceFilter('')
                    resetPage()
                  }}
                >
                  Clear Filters
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Spans table */}
        <Card>
          <Flex direction="column" gap="4">
            <Box style={{ borderBottom: '1px solid var(--gray-6)', paddingBottom: '16px' }}>
              <Heading size="4">
                Spans ({totalCount.toLocaleString()})
              </Heading>
            </Box>

            {isLoading && !spansResponse ? (
              <Flex direction="column" gap="3">
                {[...Array(5)].map((_, i) => (
                  <Box key={i} className="loading-skeleton" style={{ height: '64px', borderRadius: 'var(--radius-2)' }} />
                ))}
              </Flex>
            ) : error ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
                <Text size="2" color="red" style={{ marginTop: '8px' }}>Failed to load spans</Text>
              </Flex>
            ) : filteredSpans.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.LayersIcon width="48" height="48" color="var(--gray-8)" />
                <Text size="2" color="gray" style={{ marginTop: '8px' }}>No spans found</Text>
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
                      <Table.ColumnHeaderCell>Trace ID</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Operation"
                          sortKey="operation_name"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Duration"
                          sortKey="duration_ms"
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSortColumn}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader
                          label="Status"
                          sortKey="status_code"
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
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredSpans.map((span: Span) => (
                      <Table.Row key={span.uuid} style={{ cursor: 'pointer' }}>
                        <Table.RowHeaderCell>
                          <Text size="2">{format(new Date(span.start_time), 'HH:mm:ss.SSS')}</Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="2" style={{ fontFamily: 'var(--default-font-family-mono)' }} color="gray">
                            {span.trace_uuid.slice(0, 8)}...
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{span.operation_name}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{span.duration_ms ? `${span.duration_ms} ms` : '-'}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            color={span.status_code === 1 ? 'green' : span.status_code === 2 ? 'red' : 'gray'}
                            variant="soft"
                          >
                            {span.status_code === 1 ? 'OK' : span.status_code === 2 ? 'Error' : span.status_code === 0 ? 'Unset' : 'Unknown'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2" color="gray">{span.service_name || '-'}</Text>
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
