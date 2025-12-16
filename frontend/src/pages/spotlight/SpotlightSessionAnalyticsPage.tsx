import React, { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { Flex, Text, Card, Table, Badge, Dialog, Code, Box, Tooltip } from '@radix-ui/themes'
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
  total_cached_tokens: number
  interaction_count: number
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
  cache_creation_input_tokens: number
  latency_ms: number
  status: string
  request_data: any
  response_data: any
  tool_usages: Array<{
    tool_name: string
    tool_input: any
    tool_output: any
  }>
}

type SortColumn = 'start_time' | 'total_requests' | 'total_input_tokens' | 'total_output_tokens' | 'total_cached_tokens' | 'tool_uses' | 'tool_results'
type SortDirection = 'asc' | 'desc'

export const SpotlightSessionAnalyticsPage: React.FC = () => {
  const { token } = useAuth()
  const [selectedSessionUuid, setSelectedSessionUuid] = useState<string | null>(null)
  const [expandedInteractionUuid, setExpandedInteractionUuid] = useState<string | null>(null)
  const [expandedMessageView, setExpandedMessageView] = useState(false)
  const [sortColumn, setSortColumn] = useState<SortColumn>('start_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data: analytics, isLoading, error } = useQuery<SessionAnalytics>(
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
    if (!analytics?.sessions) return []

    const sorted = [...analytics.sessions].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case 'start_time':
          aVal = new Date(a.start_time).getTime()
          bVal = new Date(b.start_time).getTime()
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
        case 'total_cached_tokens':
          aVal = a.total_cached_tokens
          bVal = b.total_cached_tokens
          break
        case 'tool_uses':
          // For session-level sorting, we need to calculate tool uses from sessionDetail
          // Since we don't have access to sessionDetail here, we'll use 0 for now
          // This will be handled differently in the UI
          aVal = 0
          bVal = 0
          break
        case 'tool_results':
          // For session-level sorting, we need to calculate tool results from sessionDetail
          // Since we don't have access to sessionDetail here, we'll use 0 for now
          // This will be handled differently in the UI
          aVal = 0
          bVal = 0
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
  }, [analytics?.sessions, sortColumn, sortDirection])

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

  const estimateTokens = (text: string): number => {
    // Estimate tokens using 4 characters per token average
    return Math.ceil(text.length / 4)
  }

  const getTokenCount = (actualTokens: number, fallbackText?: string): { count: number; isEstimated: boolean } => {
    if (actualTokens && actualTokens > 0) {
      return { count: actualTokens, isEstimated: false }
    }
    if (fallbackText) {
      return { count: estimateTokens(fallbackText), isEstimated: true }
    }
    return { count: 0, isEstimated: false }
  }

  const formatTokenDisplay = (actualTokens: number, fallbackText?: string): string => {
    const { count, isEstimated } = getTokenCount(actualTokens, fallbackText)
    if (count === 0) return '0'
    return isEstimated ? `~${count.toLocaleString()}` : count.toLocaleString()
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

  const isLikelyMaxTokenError = (interaction: Interaction): boolean => {
    if (interaction.status !== 'error') return false
    
    const maxTokens = interaction.request_data?.max_tokens
    if (!maxTokens) return false
    
    const { count: inputTokens } = getTokenCount(
      interaction.input_tokens, 
      JSON.stringify(interaction.request_data?.messages || '')
    )
    
    return inputTokens > maxTokens
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
                    <Code size="1" style={{ display: 'block', marginTop: '4px' }}>{JSON.stringify(block.content, null, 2)}</Code>
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
          <Text size="6" weight="bold">Session Analytics</Text>
          <Text size="2" color="gray">Review conversation sessions and interaction details</Text>
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
            <Card>
              <Text size="2" color="gray" style={{ marginBottom: '8px', marginRight: '8px' }}>Total Sessions</Text>
              <Text size="6" weight="bold">{analytics?.total_sessions}</Text>
            </Card>

            <Card>
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>Recent Sessions</Text>
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
                        <Table.ColumnHeaderCell>Session ID</Table.ColumnHeaderCell>
                        <SortableHeader column="start_time">Start Time</SortableHeader>
                        <SortableHeader column="total_requests">Requests</SortableHeader>
                        <SortableHeader column="total_input_tokens">Input Tokens</SortableHeader>
                        <SortableHeader column="total_output_tokens">Output Tokens</SortableHeader>
                        <SortableHeader column="total_cached_tokens">Cached Tokens</SortableHeader>
                        <Table.ColumnHeaderCell>Tool Uses</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Tool Results</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
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
                            <code style={{ fontSize: '12px' }}>{session.session_id}</code>
                          </Table.Cell>
                          <Table.Cell>{new Date(session.start_time).toLocaleString()}</Table.Cell>
                          <Table.Cell>{session.total_requests}</Table.Cell>
                          <Table.Cell>{session.total_input_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>{session.total_output_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>{session.total_cached_tokens.toLocaleString()}</Table.Cell>
                          <Table.Cell>
                            <Text size="2" color="gray">-</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="2" color="gray">-</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={session.end_time ? 'gray' : 'green'}>
                              {session.end_time ? 'Ended' : 'Active'}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                  <Text size="1" color="gray" mt="2" style={{ fontStyle: 'italic' }}>
                    * Token totals exclude estimated counts from error responses
                  </Text>
                </>
              )}
            </Card>
          </>
        )}
      </Flex>

      {/* Session Detail Modal */}
      <Dialog.Root open={!!selectedSessionUuid} onOpenChange={(open) => !open && setSelectedSessionUuid(null)}>
        <Dialog.Content style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
          <Dialog.Title>Session Details</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {sessionDetail?.session.session_id}
          </Dialog.Description>

          <Box style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
            {loadingDetail ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
                <Text>Loading session details...</Text>
              </Flex>
            ) : sessionDetail ? (
              <Flex direction="column" gap="4">
              {/* Session Summary */}
              <Card>
                <Flex direction="column" gap="2">
                  <Flex justify="between">
                    <Text size="2" color="gray">Total Requests</Text>
                    <Text size="2" weight="bold">{sessionDetail.session.total_requests}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2" color="gray">Input Tokens</Text>
                    <Text size="2" weight="bold">{sessionDetail.session.total_input_tokens.toLocaleString()}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2" color="gray">Output Tokens</Text>
                    <Text size="2" weight="bold">{sessionDetail.session.total_output_tokens.toLocaleString()}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2" color="gray">Cached Tokens</Text>
                    <Text size="2" weight="bold">{sessionDetail.session.total_cached_tokens.toLocaleString()}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2" color="gray">Tool Uses</Text>
                    <Text size="2" weight="bold">{getSessionToolUses(sessionDetail)}</Text>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2" color="gray">Tool Results</Text>
                    <Text size="2" weight="bold">{getSessionToolResults(sessionDetail)}</Text>
                  </Flex>
                </Flex>
                <Text size="1" color="gray" mt="2" style={{ fontStyle: 'italic' }}>
                  * Estimated token counts from error responses are not included in these totals
                </Text>
              </Card>

              {/* Interactions Table */}
              <Text size="4" weight="bold">Interactions</Text>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Latency</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Cached Tokens</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Tool Uses</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Tool Results</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
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
                            {new Date(interaction.request_timestamp).toLocaleTimeString()}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell><Badge>{interaction.model}</Badge></Table.Cell>
                        <Table.Cell>{interaction.latency_ms.toLocaleString()} ms</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.input_tokens, JSON.stringify(interaction.request_data?.messages || ''))}</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.output_tokens, interaction.response_data?.content || '')}</Table.Cell>
                        <Table.Cell>{formatTokenDisplay(interaction.cache_read_input_tokens)}</Table.Cell>
                        <Table.Cell>{getInteractionToolUses(interaction)}</Table.Cell>
                        <Table.Cell>{getInteractionToolResults(interaction)}</Table.Cell>
                        <Table.Cell>
                          <Flex align="center" gap="2">
                            <Badge color={interaction.status === 'success' ? 'green' : 'red'}>
                              {interaction.status}
                            </Badge>
                            {isLikelyMaxTokenError(interaction) && (
                              <Tooltip content="This error was likely caused by exceeding the max token limit">
                                <InfoCircledIcon style={{ color: 'var(--orange-9)', cursor: 'help' }} />
                              </Tooltip>
                            )}
                          </Flex>
                        </Table.Cell>
                      </Table.Row>

                      {/* Expanded Row */}
                      {expandedInteractionUuid === interaction.uuid && (
                        <Table.Row>
                          <Table.Cell colSpan={9} style={{ maxWidth: '0', width: '100%' }}>
                            <Card style={{ background: 'var(--gray-2)', maxWidth: '100%', overflow: 'hidden' }}>
                              <Flex direction="column" gap="3" p="3">
                                {/* Request Metadata Table */}
                                <Box>
                                  <Text size="3" weight="bold" mb="2">Request Metadata</Text>
                                  <Table.Root variant="surface">
                                    <Table.Header>
                                      <Table.Row>
                                        <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Max Tokens</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Temperature</Table.ColumnHeaderCell>
                                      </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                      <Table.Row>
                                        <Table.Cell><Badge>{interaction.model}</Badge></Table.Cell>
                                        <Table.Cell><Badge>{interaction.provider}</Badge></Table.Cell>
                                        <Table.Cell>{interaction.request_data?.max_tokens || 'N/A'}</Table.Cell>
                                        <Table.Cell>{interaction.request_data?.temperature !== undefined ? interaction.request_data.temperature : 'N/A'}</Table.Cell>
                                      </Table.Row>
                                    </Table.Body>
                                  </Table.Root>
                                </Box>

                                {/* Response Metadata Table */}
                                <Box>
                                  <Text size="3" weight="bold" mb="2">Response Metadata</Text>
                                  <Table.Root variant="surface">
                                    <Table.Header>
                                      <Table.Row>
                                        <Table.ColumnHeaderCell>Stop Reason</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Cache Read</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Cache Creation</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Latency</Table.ColumnHeaderCell>
                                      </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                      <Table.Row>
                                        <Table.Cell>{interaction.response_data?.stop_reason || 'N/A'}</Table.Cell>
                                        <Table.Cell>{formatTokenDisplay(interaction.input_tokens, JSON.stringify(interaction.request_data?.messages || ''))}</Table.Cell>
                                        <Table.Cell>{formatTokenDisplay(interaction.output_tokens, interaction.response_data?.content || '')}</Table.Cell>
                                        <Table.Cell>{formatTokenDisplay(interaction.cache_read_input_tokens)}</Table.Cell>
                                        <Table.Cell>{formatTokenDisplay(interaction.cache_creation_input_tokens)}</Table.Cell>
                                        <Table.Cell>{interaction.latency_ms} ms</Table.Cell>
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
                                          <Text size="2" color="blue">Show full conversation ({interaction.request_data.messages.length} messages)</Text>
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
