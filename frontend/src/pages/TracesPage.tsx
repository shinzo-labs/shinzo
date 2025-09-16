import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { telemetryService } from '../backendService'
import { format, subHours, subDays } from 'date-fns'

interface Trace {
  uuid: string
  start_time: string
  end_time: string | null
  service_name: string
  operation_name: string | null
  status: string | null
  span_count: number
  duration_ms: number | null
}

export const TracesPage: React.FC = () => {
  const { token } = useAuth()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Calculate time range
  const getTimeRange = () => {
    const end = new Date()
    let start = new Date()

    switch (timeRange) {
      case '15m':
        start = new Date(end.getTime() - 15 * 60 * 1000)
        break
      case '1h':
        start = subHours(end, 1)
        break
      case '6h':
        start = subHours(end, 6)
        break
      case '24h':
        start = subHours(end, 24)
        break
      case '7d':
        start = subDays(end, 7)
        break
      default:
        start = subHours(end, 1)
    }

    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    }
  }

  // Fetch traces
  const { data: traces = [], isLoading, error } = useQuery(
    ['traces', timeRange, serviceFilter, statusFilter],
    async () => {
      const timeParams = getTimeRange()
      return telemetryService.fetchTraces(token!, timeParams)
    },
    { enabled: !!token }
  )

  // Filter traces based on selected filters
  const filteredTraces = traces.filter((trace: Trace) => {
    if (serviceFilter && !trace.service_name.toLowerCase().includes(serviceFilter.toLowerCase())) {
      return false
    }
    if (statusFilter && statusFilter !== 'all' && trace.status !== statusFilter) {
      return false
    }
    return true
  })

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'ok', label: 'Success' },
    { value: 'error', label: 'Error' },
    { value: 'timeout', label: 'Timeout' },
  ]

  const timeRangeOptions = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
  ]

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header */}
        <Flex justify="between" align="center">
          <Box>
            <Heading size="6">Traces</Heading>
            <Text color="gray">
              Distributed tracing analysis and visualization
            </Text>
          </Box>
          <Button variant="outline">
            <Icons.ReloadIcon />
            Refresh
          </Button>
        </Flex>

        {/* Filters */}
        <Card>
          <Flex direction="column" gap="4">
            <Text size="3" weight="medium">Filters</Text>
            <Flex gap="4" wrap="wrap">
              {/* Time range */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Time Range</Text>
                <Select.Root value={timeRange} onValueChange={setTimeRange}>
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
                  onChange={(e) => setServiceFilter(e.target.value)}
                />
              </Flex>

              {/* Status filter */}
              <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
                <Text size="2" weight="medium">Status</Text>
                <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
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
                Traces ({filteredTraces.length})
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
                <Text size="2" color="red" style={{ marginTop: '8px' }}>Failed to load traces</Text>
              </Flex>
            ) : filteredTraces.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ActivityLogIcon width="48" height="48" color="var(--gray-8)" />
                <Text size="2" color="gray" style={{ marginTop: '8px' }}>No traces found</Text>
                <Text size="1" color="gray">
                  Try adjusting your filters or time range
                </Text>
              </Flex>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Start Time</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Service</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Operation</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Spans</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredTraces.map((trace: Trace) => (
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
                        <Text size="2">{trace.duration_ms ? `${trace.duration_ms}ms` : '-'}</Text>
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
            )}
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  )
}