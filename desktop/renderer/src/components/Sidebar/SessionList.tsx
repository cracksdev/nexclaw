import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  FolderOpen,
  History,
  RotateCcw,
  Clock,
  Sparkles,
  Bookmark,
  RefreshCw,
  GitBranch,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { useSessionStore, type Session, type Revision, type ClaudeCodeSessionInfo } from '../../stores/sessionStore'
import { useChatStore } from '../../stores/chatStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useNavigationStore } from '../../stores/navigationStore'

type View = 'sessions' | 'revisions' | 'claude'

function RelativeTime({ timestamp }: { timestamp: number }) {
  const now = Date.now()
  const diff = now - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  let text: string
  if (mins < 1) text = 'just now'
  else if (mins < 60) text = `${mins}m ago`
  else if (hours < 24) text = `${hours}h ago`
  else if (days < 7) text = `${days}d ago`
  else text = new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })

  return <span className="text-[10px] text-text-muted">{text}</span>
}

function SessionCard({ session, isActive, onSelect, onDelete }: {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect() }}
      className={`
        group flex items-start gap-2.5 w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer
        ${isActive
          ? 'bg-accent/8 border border-accent/20 text-text-primary'
          : 'text-text-secondary hover:bg-bg-hover/50 border border-transparent'
        }
      `}
    >
      <div className="shrink-0 mt-0.5">
        {session.projectFolder ? (
          <FolderOpen size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
        ) : session.lastAiSummary ? (
          <Sparkles size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
        ) : (
          <MessageSquare size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight">{session.title}</p>
        {session.preview && (
          <p className="text-[10px] text-text-muted truncate mt-0.5 leading-tight">
            {session.preview}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <RelativeTime timestamp={session.updatedAt} />
          {session.messageCount > 0 && (
            <span className="text-[9px] text-text-muted bg-bg-secondary px-1 py-0.5 rounded">
              {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
            </span>
          )}
          {session.projectFolder && (
            <span className="text-[9px] text-accent/70 bg-accent/5 px-1 py-0.5 rounded truncate max-w-[80px]">
              {session.projectFolder}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-text-muted hover:text-error transition-all shrink-0 mt-0.5"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function RevisionCard({ revision, onRestore, onDelete }: {
  revision: Revision
  onRestore: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const msgCount = revision.messages.length
  const lastMsg = revision.messages[revision.messages.length - 1]
  const preview = lastMsg
    ? lastMsg.content.substring(0, 80)
    : ''

  return (
    <div className="group flex items-start gap-2.5 w-full px-3 py-2.5 rounded-lg border border-transparent hover:bg-bg-hover/50 transition-all">
      <div className="shrink-0 mt-0.5">
        <Bookmark size={14} className="text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{revision.label}</p>
        {preview && (
          <p className="text-[10px] text-text-muted truncate mt-0.5">{preview}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <RelativeTime timestamp={revision.timestamp} />
          <span className="text-[9px] text-text-muted bg-bg-secondary px-1 py-0.5 rounded">
            {msgCount} msg{msgCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onRestore}
          className="p-1 rounded hover:bg-green-50 text-text-muted hover:text-green-600 transition-all"
          title="Restore this revision"
        >
          <RotateCcw size={12} />
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-text-muted hover:text-error transition-all"
          title="Delete revision"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function ClaudeSessionCard({ session, onResume, isLoading }: {
  session: ClaudeCodeSessionInfo
  onResume: () => void
  isLoading: boolean
}) {
  const cwdParts = session.cwd?.replace(/\\/g, '/').split('/') || []
  const folderName = cwdParts[cwdParts.length - 1] || ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isLoading && onResume()}
      onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) onResume() }}
      className="group flex items-start gap-2.5 w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer text-text-secondary hover:bg-bg-hover/50 border border-transparent"
    >
      <div className="shrink-0 mt-0.5">
        <ExternalLink size={14} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight text-text-primary">
          {session.customTitle || session.summary}
        </p>
        {session.firstPrompt && session.firstPrompt !== session.summary && (
          <p className="text-[10px] text-text-muted truncate mt-0.5 leading-tight">
            {session.firstPrompt}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <RelativeTime timestamp={session.lastModified} />
          {folderName && (
            <span className="text-[9px] text-blue-500/70 bg-blue-50 px-1 py-0.5 rounded truncate max-w-[80px]">
              {folderName}
            </span>
          )}
          {session.gitBranch && (
            <span className="text-[9px] text-text-muted bg-bg-secondary px-1 py-0.5 rounded flex items-center gap-0.5 truncate max-w-[80px]">
              <GitBranch size={8} />
              {session.gitBranch}
            </span>
          )}
        </div>
      </div>
      {isLoading && (
        <Loader2 size={14} className="animate-spin text-accent shrink-0 mt-0.5" />
      )}
    </div>
  )
}

export function SessionList() {
  const {
    sessions, activeSessionId, revisions,
    createSession, setActiveSession, deleteSession,
    createRevision, restoreRevision, deleteRevision,
    claudeSessions, claudeSessionsLoading, loadClaudeSessions, resumeClaudeSession,
  } = useSessionStore()
  const { clearMessages } = useChatStore()
  const { workingDirectory } = useSettingsStore()
  const [view, setView] = useState<View>('sessions')
  const [resumingId, setResumingId] = useState<string | null>(null)

  useEffect(() => {
    loadClaudeSessions(workingDirectory || undefined)
  }, [workingDirectory, loadClaudeSessions])

  const handleNewChat = () => {
    clearMessages()
    createSession()
  }

  const handleSelectSession = (id: string) => {
    const session = sessions.find((s) => s.id === id)
    if (session) {
      setActiveSession(id)
      useChatStore.setState({ messages: session.messages })
    }
  }

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteSession(id)
    if (activeSessionId === id) {
      clearMessages()
    }
  }

  const handleSaveRevision = () => {
    createRevision()
  }

  const handleRestore = (revisionId: string) => {
    restoreRevision(revisionId)
    const { activeSessionId: sid } = useSessionStore.getState()
    if (sid) {
      const session = useSessionStore.getState().sessions.find((s) => s.id === sid)
      if (session) {
        useChatStore.setState({ messages: session.messages })
      }
    }
    setView('sessions')
  }

  const handleResumeClaudeSession = async (sessionInfo: ClaudeCodeSessionInfo) => {
    console.log('[SessionList] Resuming Claude session:', sessionInfo.sessionId)
    setResumingId(sessionInfo.sessionId)
    const newId = await resumeClaudeSession(sessionInfo)
    console.log('[SessionList] Resume returned newId:', newId)
    setResumingId(null)
    if (newId) {
      const session = useSessionStore.getState().sessions.find((s) => s.id === newId)
      if (session) {
        console.log('[SessionList] Loading', session.messages.length, 'messages into chat')
        useChatStore.setState({ messages: session.messages })
        useNavigationStore.getState().setPage('chat')
      }
      setView('sessions')
    }
  }

  const handleRefreshClaudeSessions = () => {
    loadClaudeSessions(workingDirectory || undefined)
  }

  const currentRevisions = activeSessionId
    ? revisions.filter((r) => r.sessionId === activeSessionId)
    : revisions

  const currentSession = sessions.find((s) => s.id === activeSessionId)
  const hasMessages = (currentSession?.messageCount ?? 0) > 0

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      <div className="p-3 space-y-2 border-b border-border">
        <div className="flex gap-1.5">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-btn-primary text-white hover:bg-btn-primary-hover transition-colors"
          >
            <Plus size={14} />
            New Chat
          </button>
          <button
            onClick={handleSaveRevision}
            disabled={!hasMessages}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Save current state as revision"
          >
            <Bookmark size={14} />
          </button>
        </div>

        <div className="flex items-center bg-bg-primary rounded-md p-0.5">
          <button
            onClick={() => setView('sessions')}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all ${
              view === 'sessions'
                ? 'bg-btn-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Clock size={10} />
            Active ({sessions.length})
          </button>
          <button
            onClick={() => setView('claude')}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all ${
              view === 'claude'
                ? 'bg-btn-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <ExternalLink size={10} />
            Resume ({claudeSessions.length})
          </button>
          <button
            onClick={() => setView('revisions')}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition-all ${
              view === 'revisions'
                ? 'bg-btn-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <History size={10} />
            Rev ({currentRevisions.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {view === 'sessions' && (
          <>
            {sessions.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare size={24} className="mx-auto text-text-muted mb-2 opacity-40" />
                <p className="text-xs text-text-muted">No sessions yet</p>
                <p className="text-[10px] text-text-muted mt-1">Start a new chat to begin</p>
              </div>
            )}
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => handleSelectSession(session.id)}
                onDelete={(e) => handleDeleteSession(e, session.id)}
              />
            ))}
          </>
        )}

        {view === 'claude' && (
          <>
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-[10px] text-text-muted font-medium">Claude Code Sessions</p>
              <button
                onClick={handleRefreshClaudeSessions}
                disabled={claudeSessionsLoading}
                className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary disabled:opacity-30 transition-all"
                title="Refresh"
              >
                <RefreshCw size={12} className={claudeSessionsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {claudeSessionsLoading && claudeSessions.length === 0 && (
              <div className="text-center py-10">
                <Loader2 size={24} className="mx-auto text-accent mb-2 animate-spin" />
                <p className="text-xs text-text-muted">Loading sessions...</p>
              </div>
            )}

            {!claudeSessionsLoading && claudeSessions.length === 0 && (
              <div className="text-center py-10">
                <ExternalLink size={24} className="mx-auto text-text-muted mb-2 opacity-40" />
                <p className="text-xs text-text-muted">No Claude Code sessions found</p>
                <p className="text-[10px] text-text-muted mt-1 max-w-[180px] mx-auto">
                  Sessions from ~/.claude/ will appear here when available
                </p>
              </div>
            )}

            {claudeSessions.map((cs) => (
              <ClaudeSessionCard
                key={cs.sessionId}
                session={cs}
                onResume={() => handleResumeClaudeSession(cs)}
                isLoading={resumingId === cs.sessionId}
              />
            ))}
          </>
        )}

        {view === 'revisions' && (
          <>
            {currentRevisions.length === 0 && (
              <div className="text-center py-10">
                <History size={24} className="mx-auto text-text-muted mb-2 opacity-40" />
                <p className="text-xs text-text-muted">No revisions saved</p>
                <p className="text-[10px] text-text-muted mt-1 max-w-[180px] mx-auto">
                  Click the bookmark icon to save a snapshot before making changes
                </p>
              </div>
            )}
            {currentRevisions.map((revision) => (
              <RevisionCard
                key={revision.id}
                revision={revision}
                onRestore={() => handleRestore(revision.id)}
                onDelete={(e) => { e.stopPropagation(); deleteRevision(revision.id) }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
