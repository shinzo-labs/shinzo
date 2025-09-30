import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, Card, Flex, Text, Heading, Badge, Box, Table, TextField } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { sessionService } from '../backendService'

interface Session {
  session_uuid: string
  session_id: string
  resource_uuid: string
  start_time: string
  end_time: string | null
  is_completed: boolean
  event_count: number
  metadata: Record<string, any> | null
  service_name?: string
}

export const SessionsPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all')

  const { data: sessions = [], isLoading, error, refetch } = useQuery(
    ['sessions', statusFilter],
    async () => {
      return sessionService.fetchSessions(token!)
    },
    {
      enabled: !!token,
    }
  )

  const filteredSessions = sessions.filter((session: Session) => {
    const matchesSearch = searchQuery === '' ||
      session.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.service_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && !session.is_completed) ||
      (statusFilter === 'completed' && session.is_completed)

    return matchesSearch && matchesStatus
  })

  const totalCount = filteredSessions.length
  const activeCount = sessions.filter((s: Session) => !s.is_completed).length
  const completedCount = sessions.filter((s: Session) => s.is_completed).length

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress'
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const durationMs = end - start

    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center">
          <Heading size="6">Sessions</Heading>
          <Button variant="soft" onClick={() => refetch()}>
            <Icons.ReloadIcon />
            Refresh
          </Button>
        </Flex>

        <Flex gap="4">
          <Card style={{ flex: 1 }}>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Total Sessions</Text>
              <Heading size="6">{sessions.length}</Heading>
            </Flex>
          </Card>
          <Card style={{ flex: 1 }}>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Active</Text>
              <Heading size="6">{activeCount}</Heading>
            </Flex>
          </Card>
          <Card style={{ flex: 1 }}>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Completed</Text>
              <Heading size="6">{completedCount}</Heading>
            </Flex>
          </Card>
        </Flex>

        <Card>
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--gray-6)' }}>
              <Heading size="4">Session History</Heading>
              <Flex gap="2">
                <TextField.Root
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '250px' }}
                >
                  <TextField.Slot>
                    <Icons.MagnifyingGlassIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
                <Flex gap="1">
                  <Button
                    variant={statusFilter === 'all' ? 'solid' : 'soft'}
                    onClick={() => setStatusFilter('all')}
                    size="2"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'solid' : 'soft'}
                    onClick={() => setStatusFilter('active')}
                    size="2"
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'completed' ? 'solid' : 'soft'}
                    onClick={() => setStatusFilter('completed')}
                    size="2"
                  >
                    Completed
                  </Button>
                </Flex>
              </Flex>
            </Flex>

            {isLoading ? (
              <Flex justify="center" align="center" style={{ padding: '48px 0' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderBottomColor: 'rgb(92, 122, 255)'}}></div>
              </Flex>
            ) : error ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
                <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>Error loading sessions</Heading>
                <Text color="gray">Please try again later</Text>
              </Flex>
            ) : filteredSessions.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0', textAlign: 'center' }}>
                <Icons.ClockIcon width="48" height="48" color="var(--gray-8)" />
                <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>No sessions found</Heading>
                <Text color="gray">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start instrumenting your MCP servers to track sessions'}
                </Text>
              </Flex>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Session</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Events</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Started</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredSessions.map((session: Session) => (
                    <Table.Row key={session.session_uuid}>
                      <Table.RowHeaderCell>
                        <Flex direction="column" gap="1">
                          <Text size="2" weight="medium" style={{ fontFamily: 'monospace' }}>
                            {session.session_id.substring(0, 8)}
                          </Text>
                          {session.service_name && (
                            <Text size="1" color="gray">{session.service_name}</Text>
                          )}
                        </Flex>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" style={{ fontFamily: 'monospace' }} color="gray">
                          {session.resource_uuid.substring(0, 8)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={session.is_completed ? 'gray' : 'green'} variant="soft">
                          {session.is_completed ? 'Completed' : 'Active'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2">{session.event_count} events</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {formatDuration(session.start_time, session.end_time)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {new Date(session.start_time).toLocaleString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="1"
                          variant="soft"
                          onClick={() => navigate(`/sessions/${session.session_uuid}`)}
                        >
                          <Icons.PlayIcon />
                          View
                        </Button>
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
