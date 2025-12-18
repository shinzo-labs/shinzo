import React, { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge, Dialog, Grid, Code, Box, Tooltip, Spinner } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronDownIcon, ChevronUpIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

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
}

interface SessionAnalytics {
  sessions: Session[]
  total_sessions: number
}

interface SessionDetail {
  session: Session
  interactions: Interaction[]
}

interface Interaction {
  uuid: string
  request_timestamp: string
  response_timestamp: string
  model: string
  provider: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_ephemeral_5m_input_tokens: number
  cache_creation_ephemeral_1h_input_tokens: number
  latency_ms: number
  status: string
  error_type: string | null
  error_message: string | null
  request_data: any
  response_data: any
  tool_usages: Array<{
    tool_name: string
    tool_input: any
    tool_output: any
  }>
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
  const [selectedSessionUuid, setSelectedSessionUuid] = useState<string | null>(null)
  const [expandedInteractionUuid, setExpandedInteractionUuid] = useState<string | null>(null)
  const [expandedMessageView, setExpandedMessageView] = useState(false)
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
      retry: false
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
      retry: false
    }
  )

  const { data: sessionDetail, isLoading: loadingDetail } = useQuery<SessionDetail>(
    ['spotlight-session-detail', selectedSessionUuid],
    async () => {
      const response = await axios.get(
        `${BACKEND_URL}/spotlight/analytics/sessions/${selectedSessionUuid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data
    },
    {
      enabled: !!selectedSessionUuid,
      retry: false
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

  const formatTokenDisplay = (actualTokens: number, fallbackText: string = 'N/A'): string => {
    if (actualTokens === 0) return '0'
    else if (!actualTokens) return fallbackText
    else return actualTokens.toLocaleString()
  }

  const countToolsInMessages = (messages: any[], toolType: 'tool_use' | 'tool_result'): number => {
    if (!Array.isArray(messages)) return 0
    
    return messages.reduce((total, msg) => {
      if (Array.isArray(msg.content)) {
        return total + msg.content.filter((block: any) => block.type === toolType).length
      }
      return total
    }, 0)
  }

  const getToolCount = (
    source: any,
    type: 'tool_use' | 'tool_result'
  ) =>
    countToolsInMessages(source?.request_data?.messages || [], type) +
    countToolsInMessages(
      source?.response_data?.content ? [{ content: source.response_data.content }] : [],
      type
    )

  const getSessionToolUses = (sessionDetail: SessionDetail): number =>
    sessionDetail?.interactions
      ? sessionDetail.interactions
          .filter(i => i.status === 'success')
          .reduce((sum, i) => sum + getToolCount(i, 'tool_use'), 0)
      : 0

  const getSessionToolResults = (sessionDetail: SessionDetail): number =>
    sessionDetail?.interactions
      ? sessionDetail.interactions
          .filter(i => i.status === 'success')
          .reduce((sum, i) => sum + getToolCount(i, 'tool_result'), 0)
      : 0

  const getInteractionToolUses = (interaction: Interaction): number =>
    interaction.status === 'success' ? getToolCount(interaction, 'tool_use') : 0

  const getInteractionToolResults = (interaction: Interaction): number =>
    interaction.status === 'success' ? getToolCount(interaction, 'tool_result') : 0

  const formatLatency = (latencyMs: number): string => {
    if (latencyMs >= 1000) {
      const seconds = latencyMs / 1000
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      if (minutes > 0) {
        return `${minutes}m${remainingSeconds.toFixed(3)}s`
      }
      return `${remainingSeconds.toFixed(3)}s`
    }
    return `${latencyMs}ms`
  }

  const getMessagePreview = (messages: any[]): string => {
    if (!Array.isArray(messages) || messages.length === 0) return 'N/A'

    const lastMessage = messages[messages.length - 1]
    if (typeof lastMessage.content === 'string') {
      return lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
    } else if (Array.isArray(lastMessage.content)) {
      const textBlock = lastMessage.content.find((block: any) => block.type === 'text')
      if (textBlock?.text) {
        return textBlock.text.substring(0, 50) + (textBlock.text.length > 50 ? '...' : '')
      }
    }
    return 'N/A'
  }

  const parseSystemReminders = (text: string) => {
    const parts: Array<{ type: 'text' | 'system-reminder'; content: string }> = []
    const regex = /<system-reminder>([\s\S]*?)<\/system-reminder>/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      // Add the system-reminder
      parts.push({ type: 'system-reminder', content: match[1] })
      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }]
  }

  const renderTextWithSystemReminders = (text: string) => {
    const parts = parseSystemReminders(text)
    return parts.map((part, idx) => {
      if (part.type === 'system-reminder') {
        return (
          <Flex key={idx} gap="2" align="start" p="2" style={{ background: 'var(--blue-3)', borderRadius: '6px', border: '1px solid var(--blue-6)' }} mb="2">
            <InfoCircledIcon style={{ color: 'var(--blue-9)', marginTop: '2px', flexShrink: 0 }} />
            <Text size="1" style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{part.content}</Text>
          </Flex>
        )
      }
      return <Text key={idx} size="1" style={{ whiteSpace: 'pre-wrap' }}>{part.content}</Text>
    })
  }

  const formatMessages = (messages: any[]) => {
    if (!Array.isArray(messages)) return 'N/A'

    return messages.map((msg, idx) => {
      const isEvenMessage = idx % 2 === 0
      const bgColor = isEvenMessage ? 'var(--gray-4)' : 'var(--gray-3)'

      if (typeof msg.content === 'string') {
        return (
          <Box key={idx} mb="3" p="3" style={{ background: bgColor, borderRadius: '6px' }}>
            <Text size="1" weight="bold" color="gray" mb="2" style={{ display: 'block' }}>{msg.role}</Text>
            {renderTextWithSystemReminders(msg.content)}
          </Box>
        )
      } else if (Array.isArray(msg.content)) {
        return (
          <Box key={idx} mb="3" p="3" style={{ background: bgColor, borderRadius: '6px' }}>
            <Text size="1" weight="bold" color="gray" mb="2" style={{ display: 'block' }}>{msg.role}</Text>
            {msg.content.map((block: any, blockIdx: number) => (
              <Box key={blockIdx} ml="2" mb="2">
                {block.type === 'text' && renderTextWithSystemReminders(block.text)}
                {block.type === 'tool_use' && (
                  <Box p="2" style={{ background: 'var(--blue-2)', borderRadius: '4px', border: '1px solid var(--blue-6)' }}>
                    <Text size="1" color="blue" weight="bold">Tool: {block.name}</Text>
                    <Code size="1" style={{ display: 'block', marginTop: '4px' }}>{JSON.stringify(block.input, null, 2)}</Code>
                  </Box>
                )}
                {block.type === 'tool_result' && (
                  <Box p="2" style={{ background: 'var(--green-2)', borderRadius: '4px', border: '1px solid var(--green-6)' }}>
                    <Text size="1" color="green" weight="bold">Tool Result: {block.tool_use_id}</Text>
                    <Box style={{ marginTop: '4px' }}>
                      {typeof block.content === 'string' ? (
                        <Text size="1" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{block.content}</Text>
                      ) : Array.isArray(block.content) ? (
                        block.content.map((item: any, idx: number) => {
                          if (typeof item === 'string') {
                            return <Text key={idx} size="1" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', display: 'block' }}>{item}</Text>
                          } else if (item.type === 'text') {
                            return <Text key={idx} size="1" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', display: 'block' }}>{item.text}</Text>
                          } else {
                            return <Code key={idx} size="1" style={{ display: 'block' }}>{JSON.stringify(item, null, 2)}</Code>
                          }
                        })
                      ) : (
                        <Code size="1" style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{JSON.stringify(block.content, null, 2)}</Code>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )
      }
      return null
    })
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
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSessionUuid(session.uuid)}
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
                </>
              )}
            </Card>
          </>
        )}
      </Flex>

      {/* Session Detail Modal */}
      <Dialog.Root open={!!selectedSessionUuid} onOpenChange={(open) => !open && setSelectedSessionUuid(null)}>
        <Dialog.Content style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
          <Dialog.Title>Session ID: <code style={{ color: 'var(--blue-10)' }}>{sessionDetail?.session.session_id}</code></Dialog.Title>

          <Box style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
            {loadingDetail ? (
              <Flex direction="column" align="center" justify="center" gap="3" style={{ padding: '48px' }}>
                <Spinner size="3" />
                <Text size="2" color="gray">Loading session details...</Text>
              </Flex>
            ) : sessionDetail ? (
              <Flex direction="column" gap="4">
              {/* Session Summary */}
              <Box>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Total Requests</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>5m Cache Writes</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>1h Cache Writes</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Tool Uses</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Tool Results</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>{sessionDetail.session.total_requests}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_cache_creation_ephemeral_5m_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_cache_creation_ephemeral_1h_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_output_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{getSessionToolUses(sessionDetail)}</Table.Cell>
                      <Table.Cell>{getSessionToolResults(sessionDetail)}</Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Completions Table */}
              <Text size="4" weight="bold">Completions</Text>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Request</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Response</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Sent</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Latency</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Cache Reads</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>5m Cache Writes</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>1h Cache Writes</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sessionDetail.interactions.map((interaction) => (
                    <React.Fragment key={interaction.uuid}>
                      <Table.Row
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedInteractionUuid(
                          expandedInteractionUuid === interaction.uuid ? null : interaction.uuid
                        )}
                      >
                        <Table.Cell>
                          <Flex align="center" gap="1">
                            {expandedInteractionUuid === interaction.uuid ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            <Text size="1" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getMessagePreview(interaction.request_data?.messages || [])}
                            </Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="1" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {interaction.response_data?.content
                              ? (typeof interaction.response_data.content === 'string'
                                  ? interaction.response_data.content.substring(0, 50) + (interaction.response_data.content.length > 50 ? '...' : '')
                                  : getMessagePreview([{ role: 'assistant', content: interaction.response_data.content }]))
                              : 'N/A'}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>{new Date(interaction.request_timestamp).toLocaleString()}</Table.Cell>
                        <Table.Cell>{formatLatency(interaction.latency_ms)}</Table.Cell>
                        <Table.Cell>
                          <Flex align="center" gap="2">
                            <Badge color={interaction.status === 'success' ? 'green' : 'red'}>
                              {interaction.status}
                            </Badge>
                            {interaction.status === 'error' && interaction.error_message && (
                              <Tooltip content={`${interaction.error_type || 'Error'}: ${interaction.error_message}`}>
                                <InfoCircledIcon style={{ color: 'var(--red-9)', cursor: 'help' }} />
                              </Tooltip>
                            )}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell><Badge>{interaction.model}</Badge></Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.input_tokens, JSON.stringify(interaction.request_data?.messages || ''))}</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.cache_read_input_tokens)}</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.cache_creation_ephemeral_5m_input_tokens)}</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.cache_creation_ephemeral_1h_input_tokens)}</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.output_tokens, interaction.response_data?.content || '')}</Table.Cell>
                      </Table.Row>

                      {/* Expanded Row */}
                      {expandedInteractionUuid === interaction.uuid && (
                        <Table.Row>
                          <Table.Cell colSpan={10} style={{ maxWidth: '0', width: '100%' }}>
                            <Card style={{ background: 'var(--gray-2)', maxWidth: '100%', overflow: 'hidden' }}>
                              <Flex direction="column" gap="3" p="3">
                                {/* Request Metadata Table */}
                                <Box>
                                  <Table.Root variant="surface">
                                    <Table.Header>
                                      <Table.Row>
                                        <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Messages</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Max Tokens</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Temperature</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Stop Reason</Table.ColumnHeaderCell>
                                      </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                      <Table.Row>
                                        <Table.Cell><Badge>{interaction.model}</Badge></Table.Cell>
                                        <Table.Cell><Badge>{interaction.provider}</Badge></Table.Cell>
                                        <Table.Cell>{interaction.request_data?.messages?.length || 0}</Table.Cell>
                                        <Table.Cell>{interaction.request_data?.max_tokens || 'N/A'}</Table.Cell>
                                        <Table.Cell>{interaction.request_data?.temperature !== undefined ? interaction.request_data.temperature : 'N/A'}</Table.Cell>
                                        <Table.Cell>{interaction.response_data?.stop_reason || 'N/A'}</Table.Cell>
                                      </Table.Row>
                                    </Table.Body>
                                  </Table.Root>
                                </Box>

                                {/* Messages */}
                                <Box>
                                  <Flex justify="between" align="center" mb="2">
                                    <Text size="3" weight="bold">Messages</Text>
                                    <Text
                                      size="2"
                                      color="blue"
                                      style={{ cursor: 'pointer', userSelect: 'none' }}
                                      onClick={() => setExpandedMessageView(!expandedMessageView)}
                                    >
                                      {expandedMessageView ? '↙ Reduce' : '↗ Expand'}
                                    </Text>
                                  </Flex>
                                  <Box style={{
                                    background: 'var(--gray-3)',
                                    maxHeight: expandedMessageView ? '80vh' : '400px',
                                    width: '100%',
                                    maxWidth: '100%',
                                    minWidth: '0',
                                    overflow: 'auto',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    boxSizing: 'border-box',
                                    wordBreak: 'break-word',
                                    transition: 'max-height 0.3s ease-in-out'
                                  }}>
                                    {interaction.request_data?.messages?.length > 1 ? (
                                      <details>
                                        <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                                          <Text size="2" color="blue">Show full conversation... ({interaction.request_data.messages.length} messages)</Text>
                                        </summary>
                                        {formatMessages(interaction.request_data.messages)}
                                      </details>
                                    ) : (
                                      formatMessages(interaction.request_data?.messages || [])
                                    )}
                                  </Box>
                                </Box>

                                {/* Response */}
                                {interaction.response_data && (
                                  <Box>
                                    <Text size="3" weight="bold" mb="2">Response</Text>
                                    <Box style={{
                                      background: 'var(--gray-3)',
                                      maxHeight: expandedMessageView ? '80vh' : '400px',
                                      width: '100%',
                                      maxWidth: '100%',
                                      minWidth: '0',
                                      overflow: 'auto',
                                      padding: '8px',
                                      borderRadius: '6px',
                                      boxSizing: 'border-box',
                                      wordBreak: 'break-word',
                                      transition: 'max-height 0.3s ease-in-out'
                                    }}>
                                      {interaction.response_data.content && formatMessages([{ role: 'assistant', content: interaction.response_data.content }])}
                                    </Box>
                                  </Box>
                                )}

                                {/* Tool Usages */}
                                {interaction.tool_usages && interaction.tool_usages.length > 0 && (
                                  <Box>
                                    <Text size="3" weight="bold" mb="2">Tool Usage</Text>
                                    {interaction.tool_usages.map((tool, idx) => (
                                      <Card key={idx} mb="2" style={{ background: 'var(--gray-3)' }}>
                                        <Flex direction="column" gap="2" p="2">
                                          <Text size="2" weight="bold">{tool.tool_name}</Text>
                                          <Box>
                                            <Text size="1" color="gray">Input:</Text>
                                            <Code size="1">{JSON.stringify(tool.tool_input, null, 2)}</Code>
                                          </Box>
                                          <Box>
                                            <Text size="1" color="gray">Output:</Text>
                                            <Code size="1">{JSON.stringify(tool.tool_output, null, 2)}</Code>
                                          </Box>
                                        </Flex>
                                      </Card>
                                    ))}
                                  </Box>
                                )}
                              </Flex>
                            </Card>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </React.Fragment>
                  ))}
                </Table.Body>
              </Table.Root>
              </Flex>
            ) : (
              <Text>Failed to load session details</Text>
            )}
          </Box>
        </Dialog.Content>
      </Dialog.Root>
    </AppLayout>
  )
}
