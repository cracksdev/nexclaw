import {
  emitMessageStart,
  emitContentDelta,
  emitMessageComplete,
  emitToolUse,
  emitToolResult,
  emitPermissionRequest,
  emitError,
  emitReady,
  emitEvent
} from './protocol.js'

export class GuiEventEmitter {
  private currentMessageId: string | null = null

  emitReady(): void {
    emitReady()
  }

  onStreamEvent(event: {
    type: string
    [key: string]: unknown
  }): void {
    switch (event.type) {
      case 'message_start': {
        const id = (event.id as string) || crypto.randomUUID()
        this.currentMessageId = id
        emitMessageStart(id)
        break
      }

      case 'content_block_delta': {
        const delta = event.delta as { type?: string; text?: string } | undefined
        if (delta?.text) {
          emitContentDelta(delta.text)
        }
        break
      }

      case 'message_stop':
      case 'message_complete': {
        if (this.currentMessageId) {
          emitMessageComplete(
            this.currentMessageId,
            (event.content as string) || ''
          )
          this.currentMessageId = null
        }
        break
      }

      case 'content_block_start': {
        const contentBlock = event.content_block as { type?: string; id?: string; name?: string; input?: Record<string, unknown> } | undefined
        if (contentBlock?.type === 'tool_use') {
          emitToolUse(
            contentBlock.id || crypto.randomUUID(),
            contentBlock.name || 'unknown',
            contentBlock.input || {}
          )
        }
        break
      }

      case 'tool_result': {
        emitToolResult(
          (event.tool_use_id as string) || '',
          typeof event.content === 'string'
            ? event.content
            : JSON.stringify(event.content)
        )
        break
      }

      case 'permission_request': {
        emitPermissionRequest(
          (event.id as string) || crypto.randomUUID(),
          (event.tool as string) || 'unknown',
          (event.input as Record<string, unknown>) || {}
        )
        break
      }

      default: {
        emitEvent({
          event: 'raw',
          type: event.type,
          data: event
        })
      }
    }
  }

  onError(message: string): void {
    emitError(message)
  }
}

export const guiEmitter = new GuiEventEmitter()
