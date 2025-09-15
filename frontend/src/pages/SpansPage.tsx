import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, TextField, Card, Flex, Text, Heading, Badge, Select, Box, Table } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { API_BASE_URL, DEFAULT_TIME_RANGE } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { format, subHours, subDays } from 'date-fns'

export const SpansPage: React.FC = () => {
  const { token } = useAuth()
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE)
  const [traceIdFilter, setTraceIdFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')

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

  // Fetch spans
  const { data: spans = [], isLoading, error } = useQuery(
    ['spans', timeRange],
    async () => {
      const timeParams = getTimeRange()
      const params = new URLSearchParams(timeParams)

      const response = await fetch(`${API_BASE_URL}/telemetry/fetch_spans?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch spans')
      return response.json()
    },
    { enabled: !!token }
  )

  // Filter spans
  const filteredSpans = spans.filter((span: any) => {
    if (traceIdFilter && !span.trace_uuid.includes(traceIdFilter)) {
      return false
    }
    if (serviceFilter && !span.service_name?.toLowerCase().includes(serviceFilter.toLowerCase())) {
      return false
    }
    return true
  })

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
            <Heading size="6">Spans</Heading>
            <Text color="gray">
              Individual span analysis and debugging
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
                  <Select.Trigger style={{ width: '100%' }} />
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
                  onChange={(e) => setServiceFilter(e.target.value)}
                />
              </Flex>

              {/* Clear filters */}
              <Flex direction="column" justify="end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTraceIdFilter('')
                    setServiceFilter('')
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
                Spans ({filteredSpans.length})
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
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Start Time</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Trace ID</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Operation</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Service</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredSpans.map((span: any) => (
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
                        <Text size="2">{span.duration_ms ? `${span.duration_ms}ms` : '-'}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={span.status_code === 0 ? 'green' : span.status_code > 0 ? 'red' : 'gray'}
                          variant="soft"
                        >
                          {span.status_code === 0 ? 'OK' : span.status_code > 0 ? 'Error' : 'Unknown'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">{span.service_name || '-'}</Text>
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