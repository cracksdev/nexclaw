import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from './chatStore'
import { useSettingsStore } from './settingsStore'

export interface Session {
  id: string
  title: string
  projectFolder: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  preview: string
  lastAiSummary: string
  messageCount: number
}

export interface Revision {
  id: string
  sessionId: string
  label: string
  messages: ChatMessage[]
  timestamp: number
}

export interface ClaudeCodeSessionInfo {
  sessionId: string
  summary: string
  lastModified: number
  createdAt?: number
  firstPrompt?: string
  customTitle?: string
  cwd?: string
  gitBranch?: string
  fullPath: string
}

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  revisions: Revision[]

  claudeSessions: ClaudeCodeSessionInfo[]
  claudeSessionsLoading: boolean

  createSession: () => string
  setActiveSession: (id: string) => void
  updateSession: (id: string, update: Partial<Session>) => void
  deleteSession: (id: string) => void
  saveCurrentMessages: (messages: ChatMessage[]) => void
  setSessionProject: (id: string, cwd: string) => void

  createRevision: (label?: string) => void
  restoreRevision: (revisionId: string) => void
  deleteRevision: (revisionId: string) => void
  getSessionRevisions: (sessionId: string) => Revision[]

  loadClaudeSessions: (workingDirectory?: string) => Promise<void>
  resumeClaudeSession: (sessionInfo: ClaudeCodeSessionInfo) => Promise<string | null>
}

function folderName(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] || path
}

function assistantTextForMeta(m: ChatMessage): string {
  if (m.role !== 'assistant') return m.content
  const pre = m.content.trim()
  const post = (m.contentAfterTools ?? '').trim()
  if (pre && post) return `${pre}\n\n${post}`
  return post || pre
}

function extractAiTitle(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const text =
      (m.contentAfterTools ?? '').trim() || m.content.trim()
    if (text) {
      const firstLine = text.split('\n')[0]
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .trim()
      if (firstLine.length > 80) {
        return firstLine.substring(0, 77) + '...'
      }
      return firstLine || text.substring(0, 80)
    }
  }
  return ''
}

function extractPreview(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    const combined = assistantTextForMeta(m)
    if (m.role === 'assistant' && combined) {
      const text = combined.replace(/^#+\s*.+\n?/, '').trim()
      if (text.length > 120) return text.substring(0, 117) + '...'
      return text || combined.substring(0, 120)
    }
  }
  const lastUser = messages.findLast((m) => m.role === 'user')
  if (lastUser) {
    return lastUser.content.length > 120
      ? lastUser.content.substring(0, 117) + '...'
      : lastUser.content
  }
  return ''
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      revisions: [],
      claudeSessions: [],
      claudeSessionsLoading: false,

      createSession: () => {
        const id = crypto.randomUUID()
        const wd = useSettingsStore.getState().workingDirectory
        const folder = wd ? folderName(wd) : ''
        const session: Session = {
          id,
          title: folder || 'New Chat',
          projectFolder: folder,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          preview: '',
          lastAiSummary: '',
          messageCount: 0,
        }
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
        }))
        return id
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      updateSession: (id, update) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...update, updatedAt: Date.now() } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          revisions: state.revisions.filter((r) => r.sessionId !== id),
          activeSessionId:
            state.activeSessionId === id
              ? state.sessions.find((s) => s.id !== id)?.id ?? null
              : state.activeSessionId,
        })),

      saveCurrentMessages: (messages) => {
        const { activeSessionId } = get()
        if (!activeSessionId) return

        const aiTitle = extractAiTitle(messages)
        const preview = extractPreview(messages)
        const session = get().sessions.find((s) => s.id === activeSessionId)
        const folder = session?.projectFolder || ''

        const title = aiTitle || folder || 'New Chat'

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  title,
                  preview,
                  messages,
                  lastAiSummary: aiTitle,
                  messageCount: messages.length,
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
      },

      setSessionProject: (id, cwd) => {
        const folder = folderName(cwd)
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== id) return s
            const newTitle = s.lastAiSummary || folder || s.title
            return { ...s, projectFolder: folder, title: newTitle, updatedAt: Date.now() }
          }),
        }))
      },

      createRevision: (label) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        const session = sessions.find((s) => s.id === activeSessionId)
        if (!session || session.messages.length === 0) return

        const revision: Revision = {
          id: crypto.randomUUID(),
          sessionId: activeSessionId,
          label: label || `Snapshot at ${session.messages.length} messages`,
          messages: [...session.messages],
          timestamp: Date.now(),
        }
        set((state) => ({
          revisions: [revision, ...state.revisions].slice(0, 50),
        }))
      },

      restoreRevision: (revisionId) => {
        const { revisions, activeSessionId } = get()
        const revision = revisions.find((r) => r.id === revisionId)
        if (!revision) return

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === (activeSessionId || revision.sessionId)
              ? {
                  ...s,
                  messages: [...revision.messages],
                  updatedAt: Date.now(),
                  messageCount: revision.messages.length,
                  preview: extractPreview(revision.messages),
                  title: extractAiTitle(revision.messages) || s.projectFolder || s.title,
                  lastAiSummary: extractAiTitle(revision.messages),
                }
              : s
          ),
        }))
      },

      deleteRevision: (revisionId) =>
        set((state) => ({
          revisions: state.revisions.filter((r) => r.id !== revisionId),
        })),

      getSessionRevisions: (sessionId) =>
        get().revisions.filter((r) => r.sessionId === sessionId),

      loadClaudeSessions: async (workingDirectory) => {
        set({ claudeSessionsLoading: true })
        try {
          const sessions = await window.nexClaw?.sessions?.listClaude(workingDirectory, 30)
          if (Array.isArray(sessions)) {
            set({ claudeSessions: sessions, claudeSessionsLoading: false })
          } else {
            set({ claudeSessionsLoading: false })
          }
        } catch (err) {
          console.warn('[sessionStore] Failed to load Claude sessions:', err)
          set({ claudeSessionsLoading: false })
        }
      },

      resumeClaudeSession: async (sessionInfo) => {
        try {
          console.log('[sessionStore] Resuming Claude session:', sessionInfo.sessionId, sessionInfo.fullPath)
          const rawMessages = await window.nexClaw?.sessions?.readJsonl(sessionInfo.fullPath)
          console.log('[sessionStore] Got raw messages:', rawMessages?.length)

          if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
            console.warn('[sessionStore] No messages returned from readJsonl')
            return null
          }

          const messages: ChatMessage[] = rawMessages.map((m) => {
            const toolUse = m.toolUses?.map((t) => ({
              id: t.id || crypto.randomUUID(),
              tool: t.tool,
              input: {},
              status: 'complete' as const,
            }))

            return {
              id: crypto.randomUUID(),
              role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
              content: m.content,
              timestamp: Date.parse(m.timestamp) || Date.now(),
              toolUse,
            }
          })

          console.log('[sessionStore] Mapped', messages.length, 'chat messages',
            '(user:', messages.filter(m => m.role === 'user').length,
            'assistant:', messages.filter(m => m.role === 'assistant').length, ')')

          const id = crypto.randomUUID()
          const title = sessionInfo.customTitle || sessionInfo.summary || 'Resumed Session'
          const folder = sessionInfo.cwd ? folderName(sessionInfo.cwd) : ''
          const preview = extractPreview(messages)

          const session: Session = {
            id,
            title,
            projectFolder: folder,
            createdAt: sessionInfo.createdAt || sessionInfo.lastModified,
            updatedAt: sessionInfo.lastModified,
            messages,
            preview,
            lastAiSummary: sessionInfo.summary,
            messageCount: messages.length,
          }

          set((state) => ({
            sessions: [session, ...state.sessions],
            activeSessionId: id,
          }))

          return id
        } catch (err) {
          console.warn('[sessionStore] Failed to resume Claude session:', err)
          return null
        }
      },
    }),
    {
      name: 'nexclaw-sessions',
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          messages: s.messages.slice(-200),
        })),
        activeSessionId: state.activeSessionId,
        revisions: state.revisions.slice(0, 30),
      }),
    }
  )
)
