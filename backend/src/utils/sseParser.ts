import { Readable } from 'stream'
import { logger } from '../logger'

export interface SSEEvent {
  event: string
  data: string
  id?: string
  retry?: number
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

/**
 * Parse a raw SSE line into an event object
 */
export function parseSSELine(line: string): Partial<SSEEvent> | null {
  if (line.startsWith('event:')) {
    return { event: line.slice(6).trim() }
  }
  if (line.startsWith('data:')) {
    return { data: line.slice(5).trim() }
  }
  if (line.startsWith('id:')) {
    return { id: line.slice(3).trim() }
  }
  if (line.startsWith('retry:')) {
    return { retry: parseInt(line.slice(6).trim(), 10) }
  }
  return null
}

/**
 * Process SSE events and accumulate message state
 * This mimics the client-side logic from the code snippet provided
 */
export function processSSEEvent(
  event: SSEEvent,
  currentMessage: MessageState
): MessageState {
  try {
    const parsedData = JSON.parse(event.data)

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

      case 'content_block_delta':
        // Update the last content block with delta
        const updatedContent = [...currentMessage.content]
        const lastIndex = parsedData.index
        const lastBlock = updatedContent[lastIndex]

        if (!lastBlock) {
          logger.warn({ message: 'Content block delta for non-existent block', index: lastIndex })
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
              const currentInput = lastBlock.__json_buf || ''
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

      case 'content_block_stop':
        // Clean up __json_buf from content blocks
        const cleanedContent = currentMessage.content.map(block => {
          const { __json_buf, ...rest } = block as any
          return rest
        })
        return {
          ...currentMessage,
          content: cleanedContent,
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
        logger.error({ message: 'SSE error event received', data: event.data })
        throw new Error(`API error: ${event.data}`)

      default:
        // Handle unknown event types gracefully per Claude API versioning policy
        // New event types may be added in the future
        logger.warn({
          message: 'Unknown SSE event type - handling gracefully',
          event: event.event,
          data: parsedData
        })
        return currentMessage
    }
  } catch (error) {
    logger.error({ message: 'Error processing SSE event', error, event })
    throw error
  }
}

/**
 * Parse a stream of SSE data into discrete events
 */
export async function* parseSSEStream(stream: Readable): AsyncGenerator<SSEEvent> {
  let buffer = ''
  let currentEvent: Partial<SSEEvent> = {}

  for await (const chunk of stream) {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep the last incomplete line in buffer

    for (const line of lines) {
      if (line.trim() === '') {
        // Empty line indicates end of event
        if (currentEvent.data !== undefined) {
          yield currentEvent as SSEEvent
        }
        currentEvent = {}
      } else {
        const parsed = parseSSELine(line)
        if (parsed) {
          Object.assign(currentEvent, parsed)
        }
      }
    }
  }

  // Handle any remaining event in buffer
  if (currentEvent.data !== undefined) {
    yield currentEvent as SSEEvent
  }
}
