import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Button, Card, Flex, Text, Heading, Badge, Box, Separator, ScrollArea } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { sessionService } from '../backendService'

interface SessionEvent {
  event_uuid: string
  timestamp: string
  event_type: 'tool_call' | 'tool_response' | 'error' | 'user_input' | 'system_message'
  tool_name: string | null
  input_data: any
  output_data: any
  error_data: any
  duration_ms: number | null
  metadata: Record<string, any> | null
}

interface Session {
  session_uuid: string
  session_id: string
  resource_uuid: string
  start_time: string
  end_time: string | null
  is_completed: boolean
  metadata: Record<string, any> | null
  service_name?: string
  events: SessionEvent[]
}

export const SessionDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const { data: session, isLoading, error } = useQuery(
    ['session', sessionId],
    async () => {
      return sessionService.fetchSession(token!, sessionId!)
    },
    {
      enabled: !!token && !!sessionId,
    }
  )

  const handleExportJSON = () => {
    if (!session) return
    const dataStr = JSON.stringify(session, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `session-${session.session_id}-${new Date().toISOString()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleExportCSV = () => {
    if (!session) return

    const headers = ['Timestamp', 'Event Type', 'Tool Name', 'Duration (ms)', 'Status']
    const rows = session.events.map((event: SessionEvent) => [
      new Date(event.timestamp).toISOString(),
      event.event_type,
      event.tool_name || 'N/A',
      event.duration_ms?.toString() || 'N/A',
      event.error_data ? 'Error' : 'Success'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
    const exportFileDefaultName = `session-${session.session_id}-${new Date().toISOString()}.csv`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'tool_call': return <Icons.PlayIcon />
      case 'tool_response': return <Icons.CheckCircledIcon />
      case 'error': return <Icons.CrossCircledIcon />
      case 'user_input': return <Icons.PersonIcon />
      case 'system_message': return <Icons.InfoCircledIcon />
      default: return <Icons.DotFilledIcon />
    }
  }

  const getEventColor = (eventType: string, hasError: boolean) => {
    if (hasError) return 'red'
    switch (eventType) {
      case 'tool_call': return 'blue'
      case 'tool_response': return 'green'
      case 'error': return 'red'
      case 'user_input': return 'purple'
      case 'system_message': return 'gray'
      default: return 'gray'
    }
  }

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress'
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const durationMs = end - start

    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const selectedEvent = session?.events.find((e: SessionEvent) => e.event_uuid === selectedEventId)

  if (isLoading) {
    return (
      <AppLayout>
        <Flex justify="center" align="center" style={{ minHeight: '400px' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderBottomColor: 'rgb(92, 122, 255)'}}></div>
        </Flex>
      </AppLayout>
    )
  }

  if (error || !session) {
    return (
      <AppLayout>
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '400px', textAlign: 'center' }}>
          <Icons.ExclamationTriangleIcon width="48" height="48" color="var(--red-9)" />
          <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>Session not found</Heading>
          <Text color="gray" style={{ marginBottom: '16px' }}>The session you're looking for doesn't exist or has been deleted</Text>
          <Button onClick={() => navigate('/sessions')}>Back to Sessions</Button>
        </Flex>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <Button variant="soft" onClick={() => navigate('/sessions')}>
              <Icons.ArrowLeftIcon />
              Back
            </Button>
            <Heading size="6">Session Replay</Heading>
          </Flex>
          <Flex gap="2">
            <Button variant="soft" onClick={handleExportJSON}>
              <Icons.DownloadIcon />
              Export JSON
            </Button>
            <Button variant="soft" onClick={handleExportCSV}>
              <Icons.DownloadIcon />
              Export CSV
            </Button>
          </Flex>
        </Flex>

        <Card>
          <Flex direction="column" gap="4">
            <Flex justify="between" align="start">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Heading size="5">Session {session.session_id.substring(0, 12)}</Heading>
                  <Badge color={session.is_completed ? 'gray' : 'green'} variant="soft">
                    {session.is_completed ? 'Completed' : 'Active'}
                  </Badge>
                </Flex>
                {session.service_name && (
                  <Text size="2" color="gray">Service: {session.service_name}</Text>
                )}
              </Flex>
              <Flex direction="column" gap="2" align="end">
                <Text size="2" color="gray">Duration: {formatDuration(session.start_time, session.end_time)}</Text>
                <Text size="2" color="gray">{session.events.length} events</Text>
              </Flex>
            </Flex>

            <Separator size="4" />

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">Session Details</Text>
              <Flex gap="4">
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Started
                  </Text>
                  <Text size="2">{new Date(session.start_time).toLocaleString()}</Text>
                </Flex>
                {session.end_time && (
                  <Flex direction="column" gap="1">
                    <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ended
                    </Text>
                    <Text size="2">{new Date(session.end_time).toLocaleString()}</Text>
                  </Flex>
                )}
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Resource UUID
                  </Text>
                  <Text size="2" style={{ fontFamily: 'monospace' }}>{session.resource_uuid.substring(0, 16)}...</Text>
                </Flex>
              </Flex>
            </Flex>

            {session.metadata && Object.keys(session.metadata).length > 0 && (
              <>
                <Separator size="4" />
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Metadata</Text>
                  <Card style={{ backgroundColor: 'var(--gray-1)' }}>
                    <Flex direction="column" gap="2">
                      {Object.entries(session.metadata).map(([key, value]) => (
                        <Flex key={key} justify="between" align="center">
                          <Text size="2" color="gray">{key}</Text>
                          <Text size="2" style={{ fontFamily: 'monospace' }}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </Text>
                        </Flex>
                      ))}
                    </Flex>
                  </Card>
                </Flex>
              </>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="4">
            <Heading size="4">Event Timeline</Heading>

            {session.events.length === 0 ? (
              <Flex direction="column" align="center" justify="center" style={{ padding: '48px 0' }}>
                <Icons.ClockIcon width="48" height="48" color="var(--gray-8)" />
                <Heading size="4" style={{ marginTop: '16px', marginBottom: '8px' }}>No events yet</Heading>
                <Text color="gray">Events will appear here as they occur</Text>
              </Flex>
            ) : (
              <Flex gap="4">
                <ScrollArea style={{ flex: 1, maxHeight: '600px' }}>
                  <Flex direction="column" gap="2">
                    {session.events.map((event: SessionEvent, index: number) => (
                      <Card
                        key={event.event_uuid}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedEventId === event.event_uuid ? 'var(--accent-3)' : undefined,
                          borderLeft: `3px solid var(--${getEventColor(event.event_type, !!event.error_data)}-9)`
                        }}
                        onClick={() => setSelectedEventId(event.event_uuid)}
                      >
                        <Flex align="center" gap="3">
                          <Box style={{ color: `var(--${getEventColor(event.event_type, !!event.error_data)}-9)` }}>
                            {getEventIcon(event.event_type)}
                          </Box>
                          <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Flex justify="between" align="center">
                              <Text size="2" weight="medium">
                                {event.tool_name || event.event_type.replace('_', ' ')}
                              </Text>
                              <Text size="1" color="gray">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </Text>
                            </Flex>
                            <Flex gap="2" align="center">
                              <Badge color={getEventColor(event.event_type, !!event.error_data)} variant="soft" size="1">
                                {event.event_type.replace('_', ' ')}
                              </Badge>
                              {event.duration_ms !== null && (
                                <Text size="1" color="gray">{event.duration_ms}ms</Text>
                              )}
                            </Flex>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </ScrollArea>

                {selectedEvent && (
                  <Card style={{ flex: 1, maxHeight: '600px', overflow: 'auto' }}>
                    <Flex direction="column" gap="4">
                      <Flex justify="between" align="center">
                        <Heading size="4">Event Details</Heading>
                        <Button variant="ghost" onClick={() => setSelectedEventId(null)}>
                          <Icons.Cross2Icon />
                        </Button>
                      </Flex>

                      <Flex direction="column" gap="3">
                        <Flex direction="column" gap="1">
                          <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Event Type
                          </Text>
                          <Badge color={getEventColor(selectedEvent.event_type, !!selectedEvent.error_data)} variant="soft">
                            {selectedEvent.event_type.replace('_', ' ')}
                          </Badge>
                        </Flex>

                        {selectedEvent.tool_name && (
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Tool Name
                            </Text>
                            <Text size="2" style={{ fontFamily: 'monospace' }}>{selectedEvent.tool_name}</Text>
                          </Flex>
                        )}

                        <Flex direction="column" gap="1">
                          <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Timestamp
                          </Text>
                          <Text size="2">{new Date(selectedEvent.timestamp).toLocaleString()}</Text>
                        </Flex>

                        {selectedEvent.duration_ms !== null && (
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Duration
                            </Text>
                            <Text size="2">{selectedEvent.duration_ms}ms</Text>
                          </Flex>
                        )}

                        {selectedEvent.input_data && (
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Input Data
                            </Text>
                            <Card style={{ backgroundColor: 'var(--gray-1)', padding: '8px' }}>
                              <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {JSON.stringify(selectedEvent.input_data, null, 2)}
                              </pre>
                            </Card>
                          </Flex>
                        )}

                        {selectedEvent.output_data && (
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Output Data
                            </Text>
                            <Card style={{ backgroundColor: 'var(--gray-1)', padding: '8px' }}>
                              <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {JSON.stringify(selectedEvent.output_data, null, 2)}
                              </pre>
                            </Card>
                          </Flex>
                        )}

                        {selectedEvent.error_data && (
                          <Flex direction="column" gap="1">
                            <Text size="1" color="red" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Error Data
                            </Text>
                            <Card style={{ backgroundColor: 'var(--red-1)', padding: '8px', borderLeft: '3px solid var(--red-9)' }}>
                              <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {JSON.stringify(selectedEvent.error_data, null, 2)}
                              </pre>
                            </Card>
                          </Flex>
                        )}

                        {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Metadata
                            </Text>
                            <Card style={{ backgroundColor: 'var(--gray-1)', padding: '8px' }}>
                              <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {JSON.stringify(selectedEvent.metadata, null, 2)}
                              </pre>
                            </Card>
                          </Flex>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                )}
              </Flex>
            )}
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  )
}
