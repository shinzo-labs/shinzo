import React from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

interface ToolAnalytics {
  tools: Array<{
    tool_name: string
    description: string | null
    total_calls: number
    total_input_tokens: number
    total_output_tokens: number
    first_seen: string
    last_seen: string
  }>
  total_unique_tools: number
  total_tool_calls: number
}

export const SpotlightToolAnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useQuery<ToolAnalytics>(
    'spotlight-tool-analytics',
    async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/spotlight/analytics/tools`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    }
  )

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        <div>
          <Text size="6" weight="bold">Tool Analytics</Text>
          <Text size="2" color="gray">Track tool usage and performance</Text>
        </div>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            <Flex gap="4">
              <Card style={{ flex: 1 }}>
                <Text size="2" color="gray">Unique Tools</Text>
                <Text size="6" weight="bold">{analytics?.total_unique_tools}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text size="2" color="gray">Total Tool Calls</Text>
                <Text size="6" weight="bold">{analytics?.total_tool_calls.toLocaleString()}</Text>
              </Card>
            </Flex>

            <Card>
              <Text size="4" weight="bold" mb="3">Tool Usage</Text>
              {analytics?.tools.length === 0 ? (
                <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                  <Text size="3" color="gray">No tools used yet</Text>
                  <Text size="2" color="gray">Start using tools to see analytics</Text>
                </Flex>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Tool Name</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Total Calls</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>First Seen</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Last Seen</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {analytics?.tools.map((tool) => (
                      <Table.Row key={tool.tool_name}>
                        <Table.Cell><Badge>{tool.tool_name}</Badge></Table.Cell>
                        <Table.Cell>{tool.description || '-'}</Table.Cell>
                        <Table.Cell>{tool.total_calls.toLocaleString()}</Table.Cell>
                        <Table.Cell>{new Date(tool.first_seen).toLocaleDateString()}</Table.Cell>
                        <Table.Cell>{new Date(tool.last_seen).toLocaleDateString()}</Table.Cell>
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
