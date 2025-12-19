import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Flex, Text, Card, Table, Badge, Box, Tooltip, Spinner, Button, Dialog, Code, Switch } from '@radix-ui/themes'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../contexts/AuthContext'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'
import { ChevronDownIcon, ChevronUpIcon, InfoCircledIcon, ArrowLeftIcon, Share1Icon, CopyIcon } from '@radix-ui/react-icons'
import { MdQrCode } from 'react-icons/md'
import { QRCodeSVG } from 'qrcode.react'
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
}

interface SessionDetail {
  session: Session
  interactions: Interaction[]
  is_owner: boolean
  share_token: string
  is_share_active: boolean
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

export const SpotlightSessionDetailPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { hasSpotlightData } = useHasSpotlightData()
  const [expandedInteractionUuid, setExpandedInteractionUuid] = useState<string | null>(null)
  const [popoutMessageView, setPopoutMessageView] = useState(false)
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null)
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false)
  const [loadingShare, setLoadingShare] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  const { data: sessionDetail, isLoading: loadingDetail, refetch } = useQuery<SessionDetail>(
    ['spotlight-session-detail', shareToken],
    async () => {
      const response = await axios.get(
        `${BACKEND_URL}/spotlight/analytics/sessions/share/${shareToken}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data
    },
    {
      enabled: !!shareToken,
      retry: false,
      refetchInterval: REFRESH_INTERVAL
    }
  )

  // Derive these from query data instead of using state
  const isOwner = sessionDetail?.is_owner || false
  const shareEnabled = sessionDetail?.is_share_active || false

  const formatTokenDisplay = (actualTokens: number, fallbackText: string = 'N/A'): string => {
    if (actualTokens === 0) return '0'
    else if (!actualTokens) return fallbackText
    else return actualTokens.toLocaleString()
  }

  // const countToolsInMessages = (messages: any[], toolType: 'tool_use' | 'tool_result'): number => {
  //   if (!Array.isArray(messages)) return 0

  //   return messages.reduce((total, msg) => {
  //     if (Array.isArray(msg.content)) {
  //       return total + msg.content.filter((block: any) => block.type === toolType).length
  //     }
  //     return total
  //   }, 0)
  // }

  // const getToolCount = (
  //   source: any,
  //   type: 'tool_use' | 'tool_result'
  // ) =>
  //   countToolsInMessages(source?.request_data?.messages || [], type) +
  //   countToolsInMessages(
  //     source?.response_data?.content ? [{ content: source.response_data.content }] : [],
  //     type
  //   )

  // const getSessionToolUses = (sessionDetail: SessionDetail): number =>
  //   sessionDetail?.interactions
  //     ? sessionDetail.interactions
  //         .filter(i => i.status === 'success')
  //         .reduce((sum, i) => sum + getToolCount(i, 'tool_use'), 0)
  //     : 0

  // const getSessionToolResults = (sessionDetail: SessionDetail): number =>
  //   sessionDetail?.interactions
  //     ? sessionDetail.interactions
  //         .filter(i => i.status === 'success')
  //         .reduce((sum, i) => sum + getToolCount(i, 'tool_result'), 0)
  //     : 0

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
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'system-reminder', content: match[1] })
      lastIndex = regex.lastIndex
    }

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

  const handleCopyLink = () => {
    if (!shareToken) return
    const url = `${window.location.origin}/spotlight/session-analytics/${shareToken}`
    navigator.clipboard.writeText(url)
    setCopyLinkSuccess(true)
    setTimeout(() => setCopyLinkSuccess(false), 2000)
  }

  const handleToggleShare = async () => {
    if (!sessionDetail || !token) return

    setLoadingShare(true)
    try {
      if (shareEnabled) {
        // Disable sharing
        await axios.delete(
          `${BACKEND_URL}/spotlight/analytics/sessions/${sessionDetail.session.uuid}/share`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } else {
        // Enable sharing
        await axios.post(
          `${BACKEND_URL}/spotlight/analytics/sessions/${sessionDetail.session.uuid}/share`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
      // Refetch session data to update the share status
      await refetch()
    } catch (error) {
      console.error('Error toggling share:', error)
    } finally {
      setLoadingShare(false)
    }
  }

  const handleOpenPopout = (interaction: Interaction) => {
    setSelectedInteraction(interaction)
    setPopoutMessageView(true)
  }

  const handleBackClick = () => {
    // If user is viewing someone else's session and has no spotlight data,
    // redirect to getting started page
    if (!isOwner && !hasSpotlightData) {
      navigate('/spotlight/getting-started')
    } else {
      navigate('/spotlight/session-analytics')
    }
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="4" style={{ padding: '24px' }}>
        {/* Header with Back button */}
        <Flex direction="row" gap="3" align="center">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeftIcon /> Back
          </Button>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="6" weight="bold">Session Details</Text>
            <Text size="2" color="gray">Session ID: <code style={{ color: 'var(--blue-10)' }}>{sessionDetail?.session.session_id}</code></Text>
          </Flex>

          {/* Share Controls - Show while loading, only hide if definitely not owner */}
          {(loadingDetail || isOwner) && (
            <Flex align="center" gap="2" style={{ border: '1px solid var(--gray-6)', borderRadius: '8px', padding: '8px 12px', opacity: loadingDetail ? 0.5 : 1 }}>
              <Share1Icon />
              <Text size="2" weight="bold" style={{ marginRight: '8px' }}>Share</Text>
              <Box style={{ cursor: loadingShare || loadingDetail ? 'not-allowed' : 'pointer' }}>
                <Switch
                  checked={shareEnabled}
                  onCheckedChange={handleToggleShare}
                  disabled={loadingShare || loadingDetail}
                  style={{ cursor: loadingShare || loadingDetail ? 'not-allowed' : 'pointer' }}
                />
              </Box>
              <Button
                onClick={handleCopyLink}
                variant="soft"
                size="2"
                disabled={!shareEnabled || loadingShare || loadingDetail}
                style={{ cursor: !shareEnabled || loadingShare || loadingDetail ? 'not-allowed' : 'pointer' }}
              >
                <CopyIcon /> {copyLinkSuccess ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                onClick={() => setShowQRCode(true)}
                variant="soft"
                size="2"
                disabled={!shareEnabled || loadingShare || loadingDetail}
                style={{ cursor: !shareEnabled || loadingShare || loadingDetail ? 'not-allowed' : 'pointer' }}
              >
                {MdQrCode({ size: 16 })}
              </Button>
            </Flex>
          )}
        </Flex>

        {loadingDetail ? (
          <Card>
            <Flex direction="column" align="center" justify="center" gap="3" style={{ padding: '48px' }}>
              <Spinner size="3" />
              <Text size="2" color="gray">Loading session details...</Text>
            </Flex>
          </Card>
        ) : sessionDetail ? (
          <Flex direction="column" gap="4">
            {/* Session Summary */}
            <Card>
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>Session Summary</Text>
              <Box style={{ overflowX: 'auto', width: '100%' }}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Total Requests</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Input Tokens</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Cache Reads</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>5m Cache Writes</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>1h Cache Writes</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Output Tokens</Table.ColumnHeaderCell>
                      {/* <Table.ColumnHeaderCell>Tool Uses</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Tool Results</Table.ColumnHeaderCell> */}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>{sessionDetail.session.total_requests}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_cache_read_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_cache_creation_ephemeral_5m_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_cache_creation_ephemeral_1h_input_tokens.toLocaleString()}</Table.Cell>
                      <Table.Cell>{sessionDetail.session.total_output_tokens.toLocaleString()}</Table.Cell>
                      {/* <Table.Cell>{getSessionToolUses(sessionDetail)}</Table.Cell>
                      <Table.Cell>{getSessionToolResults(sessionDetail)}</Table.Cell> */}
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card>

            {/* Completions Table */}
            <Card>
              <Text size="4" weight="bold" style={{ marginBottom: '12px' }}>Completions</Text>
              <Box style={{ overflowX: 'auto', width: '100%' }}>
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
                        style={{
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-3)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
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
                          <Table.Cell colSpan={11} style={{ maxWidth: '0', width: '100%' }}>
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
                                    <Button
                                      variant="soft"
                                      size="2"
                                      onClick={() => handleOpenPopout(interaction)}
                                    >
                                      ↗ Pop Out
                                    </Button>
                                  </Flex>
                                  <Box style={{
                                    background: 'var(--gray-3)',
                                    maxHeight: '400px',
                                    width: '100%',
                                    maxWidth: '100%',
                                    minWidth: '0',
                                    overflow: 'auto',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    boxSizing: 'border-box',
                                    wordBreak: 'break-word'
                                  }}>
                                    {formatMessages(interaction.request_data?.messages || [])}
                                  </Box>
                                </Box>

                                {/* Response */}
                                {interaction.response_data && (
                                  <Box>
                                    <Text size="3" weight="bold" mb="2">Response</Text>
                                    <Box style={{
                                      background: 'var(--gray-3)',
                                      maxHeight: '400px',
                                      width: '100%',
                                      maxWidth: '100%',
                                      minWidth: '0',
                                      overflow: 'auto',
                                      padding: '8px',
                                      borderRadius: '6px',
                                      boxSizing: 'border-box',
                                      wordBreak: 'break-word'
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
              </Box>
            </Card>
          </Flex>
        ) : (
          <Card>
            <Flex direction="column" align="center" justify="center" style={{ padding: '48px' }}>
              <Text size="3" color="red">Failed to load session details</Text>
              <Text size="2" color="gray">Please try refreshing the page</Text>
            </Flex>
          </Card>
        )}
      </Flex>

      {/* Pop-out Modal for Messages */}
      <Dialog.Root open={popoutMessageView} onOpenChange={setPopoutMessageView}>
        <Dialog.Content style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
          <Dialog.Title>Full Conversation</Dialog.Title>
          <Box style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto', padding: '12px' }}>
            {selectedInteraction && (
              <Flex direction="column" gap="4">
                <Box>
                  <Text size="3" weight="bold" mb="2">Request Messages</Text>
                  <Box style={{
                    background: 'var(--gray-3)',
                    width: '100%',
                    overflow: 'auto',
                    padding: '8px',
                    borderRadius: '6px'
                  }}>
                    {formatMessages(selectedInteraction.request_data?.messages || [])}
                  </Box>
                </Box>
                {selectedInteraction.response_data && (
                  <Box>
                    <Text size="3" weight="bold" mb="2">Response</Text>
                    <Box style={{
                      background: 'var(--gray-3)',
                      width: '100%',
                      overflow: 'auto',
                      padding: '8px',
                      borderRadius: '6px'
                    }}>
                      {selectedInteraction.response_data.content && formatMessages([{ role: 'assistant', content: selectedInteraction.response_data.content }])}
                    </Box>
                  </Box>
                )}
              </Flex>
            )}
          </Box>
        </Dialog.Content>
      </Dialog.Root>

      {/* QR Code Modal */}
      <Dialog.Root open={showQRCode} onOpenChange={setShowQRCode}>
        <Dialog.Content className="qr-code-dialog" style={{ maxWidth: '700px', textAlign: 'center' }}>
          <Dialog.Title>Session QR Code</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Scan this code to access the session
          </Dialog.Description>
          <Flex direction="column" align="center" gap="4">
            <Box style={{ width: '100%', maxWidth: '600px', aspectRatio: '1/1' }}>
              <QRCodeSVG
                value={`${window.location.origin}/spotlight/session-analytics/${shareToken}`}
                size={600}
                level="H"
                includeMargin={true}
                style={{ width: '100%', height: 'auto', maxWidth: '100%' }}
              />
            </Box>
            <Text size="1" color="gray">
              Scan with your phone camera or QR code app
            </Text>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </AppLayout>
  )
}
