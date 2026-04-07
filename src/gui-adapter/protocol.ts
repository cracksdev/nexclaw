export interface GuiCommand {
  type: 'send_message' | 'cancel' | 'tool_response' | 'set_config'
  id?: string
  content?: string
  approved?: boolean
  key?: string
  value?: string
}

export interface GuiEvent {
  event: string
  [key: string]: unknown
}

export function createEvent(event: string, data: Record<string, unknown> = {}): GuiEvent {
  return { event, ...data }
}

export function emitEvent(event: GuiEvent): void {
  process.stdout.write(JSON.stringify(event) + '\n')
}

export function emitMessageStart(id: string): void {
  emitEvent({ event: 'message_start', id })
}

export function emitContentDelta(delta: string): void {
  emitEvent({ event: 'content_delta', delta })
}

export function emitMessageComplete(id: string, content: string): void {
  emitEvent({ event: 'message_complete', id, content })
}

export function emitToolUse(id: string, tool: string, input: Record<string, unknown>): void {
  emitEvent({ event: 'tool_use', id, tool, input })
}

export function emitToolResult(toolUseId: string, output: string): void {
  emitEvent({ event: 'tool_result', tool_use_id: toolUseId, output })
}

export function emitPermissionRequest(id: string, tool: string, input: Record<string, unknown>): void {
  emitEvent({ event: 'permission_request', id, tool, input })
}

export function emitError(message: string): void {
  emitEvent({ event: 'error', message })
}

export function emitReady(): void {
  emitEvent({ event: 'ready', version: '0.1.0' })
}
