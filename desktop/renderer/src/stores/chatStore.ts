import { create } from 'zustand'
import { useActivityIslandStore } from './activityIslandStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  /** Assistant text before any tool calls in this turn (intro / planning). */
  content: string
  /** Assistant text after tool calls (e.g. “Done. Here’s what changed…”). */
  contentAfterTools?: string
  timestamp: number
  isStreaming?: boolean
  toolUse?: ToolUse[]
}

export interface ToolUse {
  id: string
  tool: string
  input: Record<string, unknown>
  output?: string
  status: 'pending' | 'running' | 'complete' | 'error'
  needsApproval?: boolean
}

export interface PermissionRequest {
  id: string
  tool: string
  input: Record<string, unknown>
  /** Suggested permission updates when user chooses “always allow” */
  permissionSuggestions?: unknown[]
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  currentStreamingId: string | null
  pendingPermissions: PermissionRequest[]

  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, update: Partial<ChatMessage>) => void
  appendToMessage: (id: string, delta: string, afterTools?: boolean) => void
  addToolUse: (messageId: string, toolUse: ToolUse) => void
  updateToolUse: (messageId: string, toolId: string, update: Partial<ToolUse>) => void
  setStreaming: (streaming: boolean, id?: string | null) => void
  addPermissionRequest: (request: PermissionRequest) => void
  removePermissionRequest: (id: string) => void
  clearPendingPermissions: () => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  currentStreamingId: null,
  pendingPermissions: [],

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, update) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...update } : m
      )
    })),

  appendToMessage: (id, delta, afterTools = false) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id) return m
        if (afterTools) {
          return {
            ...m,
            contentAfterTools: (m.contentAfterTools ?? '') + delta,
          }
        }
        return { ...m, content: m.content + delta }
      })
    })),

  addToolUse: (messageId, toolUse) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, toolUse: [...(m.toolUse || []), toolUse] }
          : m
      )
    })),

  updateToolUse: (messageId, toolId, update) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              toolUse: m.toolUse?.map((t) =>
                t.id === toolId ? { ...t, ...update } : t
              )
            }
          : m
      )
    })),

  setStreaming: (streaming, id = null) =>
    set({ isStreaming: streaming, currentStreamingId: id }),

  addPermissionRequest: (request) =>
    set((state) => ({
      pendingPermissions: [...state.pendingPermissions, request]
    })),

  removePermissionRequest: (id) =>
    set((state) => ({
      pendingPermissions: state.pendingPermissions.filter((p) => p.id !== id)
    })),

  clearPendingPermissions: () => set({ pendingPermissions: [] }),

  clearMessages: () => {
    useActivityIslandStore.getState().resetSessionTotals()
    set({ messages: [], isStreaming: false, currentStreamingId: null, pendingPermissions: [] })
  },
}))
