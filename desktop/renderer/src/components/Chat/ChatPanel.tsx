import React, { useRef, useEffect } from 'react'
import logoNobgUrl from '../../styles/logo-nobg.png'
import { useChatStore } from '../../stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { PermissionDialog } from './PermissionDialog'
import { useCli } from '../../hooks/useCli'
import { useCommands } from '../../hooks/useCommands'
import { Sparkles } from 'lucide-react'

interface ChatPanelProps {
  onOpenSettings: () => void
}

export function ChatPanel({ onOpenSettings }: ChatPanelProps) {
  const { messages, isStreaming, pendingPermissions } = useChatStore()
  const {
    sendMessage,
    cancelStream,
    approveTool,
    dangerouslySkipPermissions,
    toggleDangerouslySkipPermissions,
  } = useCli()
  const { executeCommand } = useCommands()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleCommand = (input: string) => {
    const result = executeCommand(input)
    if (result.type === 'open_settings') {
      onOpenSettings()
    } else if (result.type === 'send_prompt') {
      sendMessage(result.prompt)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <img src={logoNobgUrl} alt="NexClaw" className="w-32 h-32 object-fill rounded-full" />
            <h2 className="text-xl font-semibold text-text-primary mb-1.5 tracking-tight">NexClaw</h2>
            <p className="text-[13px] text-center max-w-md mb-1 text-text-secondary">
              AI coding assistant powered by Claude Code
            </p>
            <p className="text-xs text-text-muted text-center max-w-md mb-6">
              Type a message, use <span className="font-mono text-accent font-medium">/commands</span>, or run <span className="font-mono text-tool-bash font-medium">!shell</span>
            </p>
            <div className="grid grid-cols-2 gap-2.5 max-w-sm w-full">
              <button onClick={() => handleCommand('/help')} className="text-left px-3.5 py-2.5 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all hover:shadow-sm">
                <p className="text-xs font-semibold text-text-primary">/help</p>
                <p className="text-[10px] text-text-muted mt-0.5">See all commands</p>
              </button>
              <button onClick={() => handleCommand('/status')} className="text-left px-3.5 py-2.5 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all hover:shadow-sm">
                <p className="text-xs font-semibold text-text-primary">/status</p>
                <p className="text-[10px] text-text-muted mt-0.5">Session info</p>
              </button>
              <button onClick={() => handleCommand('/model')} className="text-left px-3.5 py-2.5 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all hover:shadow-sm">
                <p className="text-xs font-semibold text-text-primary">/model</p>
                <p className="text-[10px] text-text-muted mt-0.5">Change model</p>
              </button>
              <button onClick={() => handleCommand('/mcp')} className="text-left px-3.5 py-2.5 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all hover:shadow-sm">
                <p className="text-xs font-semibold text-text-primary">/mcp</p>
                <p className="text-[10px] text-text-muted mt-0.5">MCP servers</p>
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {pendingPermissions.length > 0 && (
        <div className="px-4 pb-2">
          {pendingPermissions.map((perm) => (
            <PermissionDialog
              key={perm.id}
              permission={perm}
              onAllowOnce={() => approveTool(perm.id, 'once')}
              onAllowAlways={() => approveTool(perm.id, 'always')}
              onDeny={() => approveTool(perm.id, 'no')}
            />
          ))}
        </div>
      )}

      <InputBar
        onSend={sendMessage}
        onCommand={handleCommand}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        dangerouslySkipPermissions={dangerouslySkipPermissions}
        onToggleDangerouslySkipPermissions={() => void toggleDangerouslySkipPermissions()}
      />
    </div>
  )
}
