import React from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useCliSessionStore } from '../../stores/cliSessionStore'

export function StatusBar() {
  const { isStreaming, messages } = useChatStore()
  const { activeModel } = useCliSessionStore()

  const tokenEstimate = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)

  return (
    <div className="flex items-center justify-center h-6 bg-bg-primary border-t border-border/40 px-4 text-[10px] text-text-muted select-none shrink-0 gap-4">
      {isStreaming && (
        <span className="flex items-center gap-1 text-accent">
          <RefreshCw size={9} className="animate-spin" />
          Generating
        </span>
      )}
      {tokenEstimate > 0 && (
        <span>~{tokenEstimate.toLocaleString()} tokens</span>
      )}
      {activeModel && (
        <span className="font-medium text-text-secondary">{activeModel}</span>
      )}
    </div>
  )
}
