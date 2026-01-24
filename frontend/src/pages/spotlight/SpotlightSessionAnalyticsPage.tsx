import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { Flex, Text, Card, Table, Badge, Grid, Spinner, Box } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import { spotlightService, SessionAnalyticsResponse } from '../../backendService'
import { Pagination, usePagination, SortableHeader, useSort } from '../../components/ui/Pagination'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'
const REFRESH_INTERVAL = 10000 // 10 seconds

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

type SortColumn = 'start_time' | 'end_time' | 'total_requests' | 'total_input_tokens' | 'total_output_tokens'

export const SpotlightSessionAnalyticsPage: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()

  // Pagination state
  const { page, pageSize, offset, handlePageChange, handlePageSizeChange, resetPage } = usePagination(25)
  const { sortKey, sortDirection, handleSort } = useSort('start_time', 'desc')

  const { data: sessionAnalytics, isLoading: isLoadingSessionAnalytics, error: errorSessionAnalytics } = useQuery<SessionAnalyticsResponse>(
    ['spotlight-session-analytics', page, pageSize, sortKey, sortDirection],
    async () => {
      return spotlightService.fetchSessions(token!, {
        limit: pageSize,
        offset,
        sort: sortKey || 'start_time',
        sortDirection: sortDirection
      })
    },
    {
      retry: false,
      refetchInterval: REFRESH_INTERVAL,
      keepPreviousData: true,
      enabled: !!token
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

  const handleSortColumn = (column: string) => {
    handleSort(column)
    resetPage() // Reset to first page when sort changes
  }

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

        {isLoadingSessionAnalytics && !sessionAnalytics ? (
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
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>
                Recent Sessions ({sessionAnalytics?.total_count?.toLocaleString() || 0})
              </Text>
              {!sessionAnalytics?.sessions || sessionAnalytics.sessions.length === 0 ? (
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
                          <Table.ColumnHeaderCell>
                            <SortableHeader
                              label="Started"
                              sortKey="start_time"
                              currentSort={sortKey}
                              currentDirection={sortDirection}
                              onSort={handleSortColumn}
                            />
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            <SortableHeader
                              label="Last Updated"
                              sortKey="end_time"
                              currentSort={sortKey}
                              currentDirection={sortDirection}
                              onSort={handleSortColumn}
                            />
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            <SortableHeader
                              label="Completions"
                              sortKey="total_requests"
                              currentSort={sortKey}
                              currentDirection={sortDirection}
                              onSort={handleSortColumn}
                            />
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            <SortableHeader
                              label="Input Tokens"
                              sortKey="total_input_tokens"
                              currentSort={sortKey}
                              currentDirection={sortDirection}
                              onSort={handleSortColumn}
                            />
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Cache Reads</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>5m Cache Writes</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>1h Cache Writes</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            <SortableHeader
                              label="Output Tokens"
                              sortKey="total_output_tokens"
                              currentSort={sortKey}
                              currentDirection={sortDirection}
                              onSort={handleSortColumn}
                            />
                          </Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {sessionAnalytics.sessions.map((session) => (
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

                  <Pagination
                    currentPage={page}
                    totalPages={sessionAnalytics.total_pages}
                    totalItems={sessionAnalytics.total_count}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    isLoading={isLoadingSessionAnalytics}
                  />
                </>
              )}
            </Card>
          </>
        )}
      </Flex>
    </AppLayout>
  )
}
