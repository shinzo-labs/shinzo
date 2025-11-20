import React from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge, Grid } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

interface TokenAnalytics {
  summary: {
    total_input_tokens: number
    total_output_tokens: number
    total_cached_tokens: number
    total_cache_creation_tokens: number
    total_requests: number
  }
  by_model: Record<string, {
    input_tokens: number
    output_tokens: number
    cached_tokens: number
    cache_creation_tokens: number
    request_count: number
  }>
}

export const SpotlightTokenAnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useQuery<TokenAnalytics>(
    'spotlight-token-analytics',
    async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/tokens`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    }
  )

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <div>
          <Text size="6" weight="bold">Token Analytics</Text>
          <Text size="2" color="gray">Track token usage across models and sessions</Text>
        </div>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            <Grid columns="4" gap="4">
              <Card>
                <Text size="2" color="gray">Total Requests</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_requests.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray">Input Tokens</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_input_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray">Output Tokens</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_output_tokens.toLocaleString()}</Text>
              </Card>
              <Card>
                <Text size="2" color="gray">Cached Tokens</Text>
                <Text size="6" weight="bold">{analytics?.summary.total_cached_tokens.toLocaleString()}</Text>
              </Card>
            </Grid>

            <Card>
              <Text size="4" weight="bold" mb="3">Token Usage by Model</Text>
              {Object.keys(analytics?.by_model || {}).length === 0 ? (
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
                      <Table.ColumnHeaderCell>Cached Tokens</Table.ColumnHeaderCell>
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
