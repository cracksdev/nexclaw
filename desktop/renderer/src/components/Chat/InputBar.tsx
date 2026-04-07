import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { ArrowUp, StopCircle, Terminal, Slash, Sparkles, ListTree, CheckSquare, ShieldAlert } from 'lucide-react'
import { useNavigationStore } from '../../stores/navigationStore'
import { SLASH_COMMANDS } from '../../hooks/useCommands'

interface InputBarProps {
  onSend: (message: string) => void
  onCommand: (input: string) => void
  onCancel: () => void
  isStreaming: boolean
  dangerouslySkipPermissions?: boolean
  onToggleDangerouslySkipPermissions?: () => void
}

export function InputBar({
  onSend,
  onCommand,
  onCancel,
  isStreaming,
  dangerouslySkipPermissions = false,
  onToggleDangerouslySkipPermissions,
}: InputBarProps) {
  const setPage = useNavigationStore((s) => s.setPage)
  const [input, setInput] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandsRef = useRef<HTMLDivElement>(null)

  const filteredCommands = useMemo(() => {
    if (!input.startsWith('/')) return []
    const query = input.toLowerCase().split(/\s/)[0]
    return SLASH_COMMANDS.filter((c) =>
      c.command.startsWith(query) || c.description.toLowerCase().includes(query.slice(1))
    )
  }, [input])

  useEffect(() => {
    const justSlash = input.startsWith('/') && !input.includes(' ')
    setShowCommands(justSlash && filteredCommands.length > 0)
    setSelectedIdx(0)
  }, [input, filteredCommands.length])

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setShowCommands(false)

    if (trimmed.startsWith('/')) {
      onCommand(trimmed)
    } else {
      onSend(trimmed)
    }

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isStreaming, onSend, onCommand])

  const executeCommandFromMenu = useCallback((cmd: string) => {
    setShowCommands(false)
    setInput('')
    onCommand(cmd)
  }, [onCommand])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, filteredCommands.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        if (filteredCommands[selectedIdx]) {
          setInput(filteredCommands[selectedIdx].command)
          setShowCommands(false)
        }
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (filteredCommands[selectedIdx]) {
          executeCommandFromMenu(filteredCommands[selectedIdx].command)
        }
        return
      }
      if (e.key === 'Escape') {
        setShowCommands(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit, showCommands, filteredCommands, selectedIdx, executeCommandFromMenu])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const isCommand = input.startsWith('/')
  const isShell = input.startsWith('!')

  return (
    <div className="bg-bg-primary px-4 pb-4 pt-2 shrink-0">
      <div className="relative max-w-3xl mx-auto">
        {/* Command autocomplete popup */}
        {showCommands && (
          <div
            ref={commandsRef}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-border/60 rounded-2xl shadow-xl overflow-hidden z-10 max-h-72 overflow-y-auto backdrop-blur-sm"
          >
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.command}
                onClick={() => executeCommandFromMenu(cmd.command)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                  i === selectedIdx ? 'bg-bg-secondary' : 'hover:bg-bg-hover/50'
                }`}
              >
                <Slash size={13} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-text-primary">{cmd.command}</span>
                  <span className="text-[11px] text-text-muted truncate">{cmd.description}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                  cmd.category === 'agent' ? 'bg-purple-50 text-purple-600'
                    : cmd.category === 'navigation' ? 'bg-blue-50 text-blue-600'
                    : cmd.category === 'session' ? 'bg-green-50 text-green-600'
                    : cmd.category === 'git' ? 'bg-orange-50 text-orange-600'
                    : cmd.category === 'memory' ? 'bg-yellow-50 text-yellow-600'
                    : cmd.category === 'advanced' ? 'bg-bg-secondary text-text-muted'
                    : 'bg-accent/10 text-accent'
                }`}>
                  {cmd.category}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main input container */}
        <div className={`relative rounded-2xl border bg-white shadow-sm transition-all ${
          isCommand
            ? 'border-accent/30 shadow-accent/5'
            : isShell
              ? 'border-tool-bash/30 shadow-tool-bash/5'
              : 'border-border/60 hover:border-border focus-within:border-accent/40 focus-within:shadow-md focus-within:shadow-accent/5'
        }`}>
          {/* Textarea area */}
          <div className="relative">
            {(isCommand || isShell) && (
              <div className="absolute left-4 top-3.5 pointer-events-none">
                {isShell ? (
                  <Terminal size={14} className="text-tool-bash" />
                ) : (
                  <Slash size={14} className="text-accent" />
                )}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Send a message..."
              rows={1}
              className={`w-full resize-none bg-transparent py-3 text-[13px] text-text-primary placeholder-text-muted/60 focus:outline-none ${
                isCommand || isShell ? 'pl-10 pr-14' : 'pl-4 pr-14'
              } ${isShell ? 'font-mono' : ''}`}
              disabled={isStreaming}
            />

            {/* Send / Stop button inside the input */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {isStreaming ? (
                <button
                  onClick={onCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                  title="Stop generating"
                >
                  <StopCircle size={15} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  title="Send (Enter)"
                >
                  <ArrowUp size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* Quick actions — map to real /commands & app pages (no attachments; CLI has no image upload) */}
          <div className="flex items-center gap-1 px-2.5 pb-2 pt-0">
            <button
              type="button"
              onClick={() => { onCommand('/compact') }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-accent hover:bg-accent/5 transition-colors"
              title="Summarize conversation to free context (/compact)"
            >
              <Sparkles size={11} />
              <span>Compact</span>
            </button>
            <button
              type="button"
              onClick={() => { onCommand('/plan') }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Plan before changing files (/plan)"
            >
              <ListTree size={11} />
              <span>Plan</span>
            </button>
            <button
              type="button"
              onClick={() => { setInput('!'); textareaRef.current?.focus() }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-tool-bash hover:bg-purple-50 transition-colors"
              title="Run a shell command via the agent (! prefix)"
            >
              <Terminal size={11} />
              <span>Shell</span>
            </button>
            {onToggleDangerouslySkipPermissions && (
              <button
                type="button"
                onClick={() => onToggleDangerouslySkipPermissions()}
                className={
                  dangerouslySkipPermissions
                    ? 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors border border-red-800 bg-red-600 text-white hover:bg-red-700'
                    : 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors border border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                }
                title={
                  dangerouslySkipPermissions
                    ? 'Auto-approve is ON (CLI uses --dangerously-skip-permissions). Click to turn off.'
                    : 'Enable auto-approve: restarts any in-flight run; next messages spawn Claude without tool permission prompts. Use only in trusted folders.'
                }
              >
                <ShieldAlert size={11} className="shrink-0" />
                <span>{dangerouslySkipPermissions ? 'Auto-approve on' : 'Approve all'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setPage('tasks')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-green-700 hover:bg-green-50 transition-colors"
              title="Open Task board (.nexclaw/tasks.json)"
            >
              <CheckSquare size={11} />
              <span>Tasks</span>
            </button>
            <div className="flex-1" />
            {isStreaming && (
              <span className="text-[10px] text-accent font-medium animate-pulse">Generating...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
