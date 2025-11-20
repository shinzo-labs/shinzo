import React from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

interface UserAnalytics {
  users: Array<{
    end_user_id: string
    total_requests: number
    total_input_tokens: number
    total_output_tokens: number
    total_cached_tokens: number
    first_request: string | null
    last_request: string | null
  }>
  total_unique_users: number
  total_requests: number
}

export const SpotlightUserAnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useQuery<UserAnalytics>(
    'spotlight-user-analytics',
    async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    }
  )

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <div>
          <Text size="6" weight="bold">User Analytics</Text>
          <Text size="2" color="gray">Track end user activity and token consumption</Text>
        </div>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            <Flex gap="4">
              <Card style={{ flex: 1 }}>
                <Text size="2" color="gray">Unique Users</Text>
                <Text size="6" weight="bold">{analytics?.total_unique_users}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text size="2" color="gray">Total Requests</Text>
                <Text size="6" weight="bold">{analytics?.total_requests.toLocaleString()}</Text>
              </Card>
            </Flex>

            <Card>
              <Text size="4" weight="bold" mb="3">User Activity</Text>
              {analytics?.users.length === 0 ? (
                <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                  <Text size="3" color="gray">No user activity yet</Text>
                  <Text size="2" color="gray">Start using Spotlight to see user analytics</Text>
                </Flex>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>User ID</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Requests</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Cached Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>First Request</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Last Request</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {analytics?.users.map((user) => (
                      <Table.Row key={user.end_user_id}>
                        <Table.Cell><Badge>{user.end_user_id}</Badge></Table.Cell>
                        <Table.Cell>{user.total_requests.toLocaleString()}</Table.Cell>
                        <Table.Cell>{user.total_input_tokens.toLocaleString()}</Table.Cell>
                        <Table.Cell>{user.total_output_tokens.toLocaleString()}</Table.Cell>
                        <Table.Cell>{user.total_cached_tokens.toLocaleString()}</Table.Cell>
                        <Table.Cell>
                          {user.first_request ? new Date(user.first_request).toLocaleString() : '-'}
                        </Table.Cell>
                        <Table.Cell>
                          {user.last_request ? new Date(user.last_request).toLocaleString() : '-'}
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
