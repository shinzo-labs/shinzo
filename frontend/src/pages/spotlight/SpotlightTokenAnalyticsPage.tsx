import React from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge, Grid } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

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

export const SpotlightTokenAnalyticsPage: React.FC = () => {
  const { token } = useAuth()
  const { data: analytics, isLoading, error } = useQuery<TokenAnalytics>(
    'spotlight-token-analytics',
    async () => {
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/tokens`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
    {
      retry: false
    }
  )

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <Flex direction="column" gap="2">
          <Text size="6" weight="bold">Token Analytics</Text>
          <Text size="2" color="gray">Track token usage across models and sessions</Text>
        </Flex>

        {isLoading ? (
          <Card>
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Text>Loading...</Text>
            </Flex>
          </Card>
        ) : error ? (
          <Card>
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Text size="3" color="red">Failed to load analytics</Text>
              <Text size="2" color="gray">Please try refreshing the page</Text>
            </Flex>
          </Card>
        ) : (
          <>
            <Grid columns="3" gap="4">
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Total Requests</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_requests.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Input Tokens</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_input_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Output Tokens</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_output_tokens.toLocaleString()}</Text>
              </Card>
            </Grid>

            <Grid columns="3" gap="4">
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Cache Reads</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_cached_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>5m Cache Writes</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_cache_creation_5m_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>1h Cache Writes</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_cache_creation_1h_tokens.toLocaleString()}</Text>
              </Card>
            </Grid>

            <Card>
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>Token Usage by Model</Text>
              {!analytics || Object.keys(analytics?.by_model || {}).length === 0 ? (
                <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                  <Text size="3" color="gray">No data yet</Text>
                  <Text size="2" color="gray">Start using Spotlight to see analytics</Text>
                </Flex>
              ) : (
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
                    {Object.entries(analytics?.by_model || {}).map(([model, stats]) => (
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
              )}
            </Card>
          </>
        )}
      </Flex>
    </AppLayout>
  )
}
