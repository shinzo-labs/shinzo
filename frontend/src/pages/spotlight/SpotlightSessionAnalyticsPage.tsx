import React from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge, Button } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

interface SessionAnalytics {
  sessions: Array<{
    uuid: string
    session_id: string
    start_time: string
    end_time: string | null
    total_requests: number
    total_input_tokens: number
    total_output_tokens: number
    total_cached_tokens: number
    interaction_count: number
  }>
  total_sessions: number
}

export const SpotlightSessionAnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useQuery<SessionAnalytics>(
    'spotlight-session-analytics',
    async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    }
  )

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <div>
          <Text size="6" weight="bold">Session Analytics</Text>
          <Text size="2" color="gray">Review conversation sessions and interaction details</Text>
        </div>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            <Card>
              <Text size="2" color="gray">Total Sessions</Text>
              <Text size="6" weight="bold">{analytics?.total_sessions}</Text>
            </Card>

            <Card>
              <Text size="4" weight="bold" mb="3">Recent Sessions</Text>
              {analytics?.sessions.length === 0 ? (
                <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                  <Text size="3" color="gray">No sessions yet</Text>
                  <Text size="2" color="gray">Start using Spotlight to see sessions</Text>
                </Flex>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Session ID</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Start Time</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Requests</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Cached Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {analytics?.sessions.map((session) => (
                      <Table.Row key={session.uuid}>
                        <Table.Cell>
                          <code style={{ fontSize: '12px' }}>{session.session_id}</code>
                        </Table.Cell>
                        <Table.Cell>{new Date(session.start_time).toLocaleString()}</Table.Cell>
                        <Table.Cell>{session.total_requests}</Table.Cell>
                        <Table.Cell>{session.total_input_tokens.toLocaleString()}</Table.Cell>
                        <Table.Cell>{session.total_output_tokens.toLocaleString()}</Table.Cell>
                        <Table.Cell>{session.total_cached_tokens.toLocaleString()}</Table.Cell>
                        <Table.Cell>
                          <Badge color={session.end_time ? 'gray' : 'green'}>
                            {session.end_time ? 'Ended' : 'Active'}
                          </Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Card>
          </>
        )}
      </Flex>
    </AppLayout>
  )
}
