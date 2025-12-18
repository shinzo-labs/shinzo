/**
 * SSE Client Utility for handling Server-Sent Events from Claude API
 * Supports all streaming event types: message_start, message_delta, message_stop,
 * content_block_start, content_block_delta, content_block_stop
 */

export interface SSEEvent {
  event: string
  data: any
  raw: string
}

export interface MessageState {
  id?: string
  type?: string
  role?: string
  model?: string
  content: any[]
  stop_reason?: string
  stop_sequence?: string | null
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
    cache_creation?: {
      ephemeral_5m_input_tokens?: number
      ephemeral_1h_input_tokens?: number
    }
    service_tier?: string
  }
  context_management?: any
}

export type SSEEventHandler = (event: SSEEvent, message: MessageState) => void
export type MessageCompleteHandler = (message: MessageState) => void
export type SSEErrorHandler = (error: Error) => void

/**
 * Parse SSE stream from a Response object
 */
export async function* parseSSEResponse(response: Response): AsyncGenerator<SSEEvent> {
  if (!response.body) {
    throw new Error('Response body is null')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent: Partial<SSEEvent> = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() === '') {
          // Empty line indicates end of event
          if (currentEvent.data !== undefined && currentEvent.event) {
            yield {
              event: currentEvent.event,
              data: currentEvent.data,
              raw: `event: ${currentEvent.event}\ndata: ${currentEvent.data}\n\n`
            }
          }
          currentEvent = {}
        } else if (line.startsWith('event:')) {
          currentEvent.event = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim()
          try {
            currentEvent.data = JSON.parse(dataStr)
          } catch (e) {
            console.error('Failed to parse SSE data:', dataStr, e)
            currentEvent.data = dataStr
          }
        }
      }
    }

    // Handle any remaining event in buffer
    if (currentEvent.data !== undefined && currentEvent.event) {
      yield {
        event: currentEvent.event,
        data: currentEvent.data,
        raw: `event: ${currentEvent.event}\ndata: ${currentEvent.data}\n\n`
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Process SSE event and update message state
 */
export function processSSEEvent(event: SSEEvent, currentMessage: MessageState): MessageState {
  const parsedData = event.data

  switch (event.event) {
    case 'message_start':
      // Initialize message with data from message_start event
      return {
        ...currentMessage,
        id: parsedData.message.id,
        type: parsedData.message.type,
        role: parsedData.message.role,
        model: parsedData.message.model,
        content: parsedData.message.content || [],
        usage: parsedData.message.usage,
        stop_reason: parsedData.message.stop_reason,
        stop_sequence: parsedData.message.stop_sequence,
      }

    case 'content_block_start':
      // Add new content block
      return {
        ...currentMessage,
        content: [...currentMessage.content, parsedData.content_block],
      }

    case 'content_block_delta': {
      // Update the last content block with delta
      const updatedContent = [...currentMessage.content]
      const lastIndex = parsedData.index
      const lastBlock = updatedContent[lastIndex]

      if (!lastBlock) {
        console.warn('Content block delta for non-existent block', lastIndex)
        return currentMessage
      }

      switch (parsedData.delta.type) {
        case 'text_delta':
          if (lastBlock.type === 'text') {
            updatedContent[lastIndex] = {
              ...lastBlock,
              text: (lastBlock.text || '') + parsedData.delta.text,
            }
          }
          break

        case 'citations_delta':
          if (lastBlock.type === 'text') {
            updatedContent[lastIndex] = {
              ...lastBlock,
              citations: [...(lastBlock.citations || []), parsedData.delta.citation],
            }
          }
          break

        case 'input_json_delta':
          if (lastBlock.type === 'tool_use' || lastBlock.type === 'server_tool_use' || lastBlock.type === 'mcp_tool_use') {
            // Accumulate JSON string
            const currentInput = (lastBlock as any).__json_buf || ''
            const newInput = currentInput + parsedData.delta.partial_json

            updatedContent[lastIndex] = {
              ...lastBlock,
              __json_buf: newInput,
            }

            // Try to parse accumulated JSON
            if (newInput) {
              try {
                updatedContent[lastIndex].input = JSON.parse(newInput)
              } catch (e) {
                // JSON not complete yet, will try again with next delta
              }
            }
          }
          break

        case 'thinking_delta':
          if (lastBlock.type === 'thinking') {
            updatedContent[lastIndex] = {
              ...lastBlock,
              thinking: (lastBlock.thinking || '') + parsedData.delta.thinking,
            }
          }
          break

        case 'signature_delta':
          if (lastBlock.type === 'thinking') {
            updatedContent[lastIndex] = {
              ...lastBlock,
              signature: parsedData.delta.signature,
            }
          }
          break
      }

      return {
        ...currentMessage,
        content: updatedContent,
      }
    }

    case 'content_block_stop': {
      // Clean up __json_buf from content blocks
      const cleanedContent = currentMessage.content.map(block => {
        const { __json_buf, ...rest } = block as any
        return rest
      })
      return {
        ...currentMessage,
        content: cleanedContent,
      }
    }

    case 'message_delta':
      // Update message-level fields
      return {
        ...currentMessage,
        stop_reason: parsedData.delta.stop_reason || currentMessage.stop_reason,
        stop_sequence: parsedData.delta.stop_sequence !== undefined
          ? parsedData.delta.stop_sequence
          : currentMessage.stop_sequence,
        usage: {
          ...currentMessage.usage,
          output_tokens: parsedData.usage?.output_tokens || currentMessage.usage?.output_tokens,
          input_tokens: parsedData.usage?.input_tokens !== undefined
            ? parsedData.usage.input_tokens
            : currentMessage.usage?.input_tokens,
          cache_creation_input_tokens: parsedData.usage?.cache_creation_input_tokens !== undefined
            ? parsedData.usage.cache_creation_input_tokens
            : currentMessage.usage?.cache_creation_input_tokens,
          cache_read_input_tokens: parsedData.usage?.cache_read_input_tokens !== undefined
            ? parsedData.usage.cache_read_input_tokens
            : currentMessage.usage?.cache_read_input_tokens,
        },
        context_management: parsedData.context_management || currentMessage.context_management,
      }

    case 'message_stop':
      // Final message, no changes needed
      return currentMessage

    case 'ping':
      // Ping event, no changes needed
      return currentMessage

    case 'error':
      console.error('SSE error event received:', event.data)
      throw new Error(`API error: ${JSON.stringify(event.data)}`)

    default:
      // Handle unknown event types gracefully per Claude API versioning policy
      // New event types may be added in the future
      console.warn('Unknown SSE event type - handling gracefully:', event.event, parsedData)
      return currentMessage
  }
}

/**
 * Stream a Claude API request and process SSE events
 */
export async function streamClaudeRequest(
  url: string,
  options: RequestInit,
  handlers: {
    onEvent?: SSEEventHandler
    onMessageComplete?: MessageCompleteHandler
    onError?: SSEErrorHandler
  }
): Promise<MessageState> {
  let messageState: MessageState = {
    content: [],
    usage: {}
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Accept': 'text/event-stream',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    for await (const event of parseSSEResponse(response)) {
      messageState = processSSEEvent(event, messageState)

      if (handlers.onEvent) {
        handlers.onEvent(event, messageState)
      }
    }

    if (handlers.onMessageComplete) {
      handlers.onMessageComplete(messageState)
    }

    return messageState
  } catch (error) {
    if (handlers.onError) {
      handlers.onError(error as Error)
    }
    throw error
  }
}
