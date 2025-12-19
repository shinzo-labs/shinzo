import React, { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { Flex, Text, Card, Table, Badge, Grid, Spinner, Box } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'
const REFRESH_INTERVAL = 5000 // 5 seconds

interface Session {
  uuid: string
  session_id: string
  start_time: string
  end_time: string | null
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_input_tokens: number
  total_cache_creation_ephemeral_5m_input_tokens: number
  total_cache_creation_ephemeral_1h_input_tokens: number
  interaction_count: number
  last_message_preview: string
  share_token: string
}

interface SessionAnalytics {
  sessions: Session[]
  total_sessions: number
}

interface TokenAnalytics {
  summary: {
    total_input_tokens: number
    total_output_tokens: number
    total_cached_tokens: number
    total_cache_creation_5m_tokens: number
    total_cache_creation_1h_tokens: number
    total_requests: number
  }
  by_model: Record<string, {
    input_tokens: number
    output_tokens: number
    cached_tokens: number
    cache_creation_5m_tokens: number
    cache_creation_1h_tokens: number
    request_count: number
  }>
}

type SortColumn = 'start_time' | 'end_time' | 'total_requests' | 'total_input_tokens' | 'total_output_tokens' | 'total_cache_read_input_tokens' | 'total_cache_creation_ephemeral_5m_input_tokens' | 'total_cache_creation_ephemeral_1h_input_tokens'
type SortDirection = 'asc' | 'desc'

export const SpotlightSessionAnalyticsPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [sortColumn, setSortColumn] = useState<SortColumn>('start_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data: sessionAnalytics, isLoading: isLoadingSessionAnalytics, error: errorSessionAnalytics } = useQuery<SessionAnalytics>(
    'spotlight-session-analytics',
    async () => {
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    {
      retry: false,
      refetchInterval: REFRESH_INTERVAL
    }
  )

  const { data: tokenAnalytics, isLoading: isLoadingTokenAnalytics, error: errorTokenAnalytics } = useQuery<TokenAnalytics>(
    'spotlight-token-analytics',
    async () => {
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/tokens`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    {
      retry: false,
      refetchInterval: REFRESH_INTERVAL
    }
  )

  const sortedSessions = useMemo(() => {
    if (!sessionAnalytics?.sessions) return []

    const sorted = [...sessionAnalytics.sessions].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case 'start_time':
          aVal = new Date(a.start_time).getTime()
          bVal = new Date(b.start_time).getTime()
          break
        case 'end_time':
          aVal = a.end_time ? new Date(a.end_time).getTime() : 0
          bVal = b.end_time ? new Date(b.end_time).getTime() : 0
          break
        case 'total_requests':
          aVal = a.total_requests
          bVal = b.total_requests
          break
        case 'total_input_tokens':
          aVal = a.total_input_tokens
          bVal = b.total_input_tokens
          break
        case 'total_output_tokens':
          aVal = a.total_output_tokens
          bVal = b.total_output_tokens
          break
        case 'total_cache_creation_ephemeral_5m_input_tokens':
          aVal = a.total_cache_creation_ephemeral_5m_input_tokens
          bVal = b.total_cache_creation_ephemeral_5m_input_tokens
          break
        case 'total_cache_creation_ephemeral_1h_input_tokens':
          aVal = a.total_cache_creation_ephemeral_1h_input_tokens
          bVal = b.total_cache_creation_ephemeral_1h_input_tokens
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

    return sorted
  }, [sessionAnalytics?.sessions, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const SortableHeader: React.FC<{ column: SortColumn; children: React.ReactNode }> = ({ column, children }) => (
    <Table.ColumnHeaderCell>
      <Flex
        align="center"
        gap="1"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => handleSort(column)}
      >
        {children}
        {sortColumn === column && (
          sortDirection === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
        )}
      </Flex>
    </Table.ColumnHeaderCell>
  )


  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <Flex direction="column" gap="2">
          <Text size="6" weight="bold">Token Analytics</Text>
          <Text size="2" color="gray">Track token usage across models and sessions</Text>
        </Flex>

        {isLoadingTokenAnalytics ? (
          <Card>
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Spinner size="3" />
              <Text size="2" color="gray">Loading token analytics...</Text>
            </Flex>
          </Card>
        ) : errorTokenAnalytics ? (
          <Card>
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Text size="3" color="red">Failed to load token analytics</Text>
              <Text size="2" color="gray">Please try refreshing the page</Text>
            </Flex>
          </Card>
        ) : (
          <>
            <Grid columns="3" gap="4">
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Total Requests</Text>
                <Text size="6" weight="bold">{tokenAnalytics?.summary.total_requests.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Input Tokens</Text>
                <Text size="6" weight="bold">{tokenAnalytics?.summary.total_input_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Output Tokens</Text>
                <Text size="6" weight="bold">{tokenAnalytics?.summary.total_output_tokens.toLocaleString()}</Text>
              </Card>
            </Grid>

            <Grid columns="3" gap="4">
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Cache Reads</Text>
                <Text size="6" weight="bold">{tokenAnalytics?.summary.total_cached_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>5m Cache Writes</Text>
                <Text size="6" weight="bold">{tokenAnalytics?.summary.total_cache_creation_5m_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>1h Cache Writes</Text>
                <Text size="6" weight="bold">{tokenAnalytics?.summary.total_cache_creation_1h_tokens.toLocaleString()}</Text>
              </Card>
            </Grid>

            <Card>
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>Token Usage by Model</Text>
              {!tokenAnalytics || Object.keys(tokenAnalytics?.by_model || {}).length === 0 ? (
                <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                  <Text size="3" color="gray">No data yet</Text>
                  <Text size="2" color="gray">Start using Spotlight to see analytics</Text>
                </Flex>
              ) : (
                <Box style={{ overflowX: 'auto', width: '100%' }}>
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Requests</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Cache Reads</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>5m Cache Writes</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>1h Cache Writes</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {Object.entries(tokenAnalytics?.by_model || {}).map(([model, stats]) => (
                        <Table.Row key={model}>
                          <Table.Cell><Badge>{model}</Badge></Table.Cell>
                          <Table.Cell>{stats.request_count.toLocaleString()}</Table.Cell>
                          <Table.Cell>{stats.input_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>{stats.output_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>{stats.cached_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>{stats.cache_creation_5m_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>{stats.cache_creation_1h_tokens.toLocaleString()}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}
            </Card>
          </>
        )}
      </Flex>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <Flex direction="column" gap="2">
          <Text size="6" weight="bold">Session Analytics</Text>
          <Text size="2" color="gray">Review conversation sessions and interaction details</Text>
        </Flex>

        {isLoadingSessionAnalytics ? (
          <Card>
            <Flex direction="column" align="center" justify="center" gap="3" style={{ padding: '48px' }}>
              <Spinner size="3" />
              <Text size="2" color="gray">Loading recent sessions...</Text>
            </Flex>
          </Card>
        ) : errorSessionAnalytics ? (
          <Card>
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Text size="3" color="red">Failed to load analytics</Text>
              <Text size="2" color="gray">Please try refreshing the page</Text>
            </Flex>
          </Card>
        ) : (
          <>

            <Card>
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>Recent Sessions ({sessionAnalytics?.sessions?.length?.toLocaleString() || 0})</Text>
              {!sortedSessions || sortedSessions.length === 0 ? (
                <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                  <Text size="3" color="gray">No sessions yet</Text>
                  <Text size="2" color="gray">Start using Spotlight to see sessions</Text>
                </Flex>
              ) : (
                <>
                  <Box style={{ overflowX: 'auto', width: '100%' }}>
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Last Completion</Table.ColumnHeaderCell>
                          <SortableHeader column="start_time">Started</SortableHeader>
                          <SortableHeader column="end_time">Last Updated</SortableHeader>
                          <SortableHeader column="total_requests">Completions</SortableHeader>
                          <SortableHeader column="total_input_tokens">Input Tokens</SortableHeader>
                          <SortableHeader column="total_cache_read_input_tokens">Cache Reads</SortableHeader>
                          <SortableHeader column="total_cache_creation_ephemeral_5m_input_tokens">5m Cache Writes</SortableHeader>
                          <SortableHeader column="total_cache_creation_ephemeral_1h_input_tokens">1h Cache Writes</SortableHeader>
                          <SortableHeader column="total_output_tokens">Output Tokens</SortableHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {sortedSessions.map((session) => (
                          <Table.Row
                            key={session.uuid}
                            style={{
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-3)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                            onClick={() => navigate(`/spotlight/session-analytics/${session.share_token}`)}
                          >
                            <Table.Cell>
                              <Text size="2" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {session.last_message_preview}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>{new Date(session.start_time).toLocaleString()}</Table.Cell>
                            <Table.Cell>{session.end_time ? new Date(session.end_time).toLocaleString() : 'Active'}</Table.Cell>
                            <Table.Cell>{session.interaction_count}</Table.Cell>
                            <Table.Cell>{session.total_input_tokens.toLocaleString()}</Table.Cell>
                            <Table.Cell>{session.total_cache_read_input_tokens.toLocaleString()}</Table.Cell>
                            <Table.Cell>{session.total_cache_creation_ephemeral_5m_input_tokens.toLocaleString()}</Table.Cell>
                            <Table.Cell>{session.total_cache_creation_ephemeral_1h_input_tokens.toLocaleString()}</Table.Cell>
                            <Table.Cell>{session.total_output_tokens.toLocaleString()}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </>
              )}
            </Card>
          </>
        )}
      </Flex>
    </AppLayout>
  )
}
