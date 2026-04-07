import React from 'react'
import { Minus, Square, X, PanelLeftClose, PanelLeft, Settings } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

interface TitleBarProps {
  onSettingsClick: () => void
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  const platform = window.nexClaw?.window?.platform ?? 'win32'
  const { sidebarOpen, toggleSidebar } = useSettingsStore()
  const isMac = platform === 'darwin'

  return (
    <div className="drag-region flex items-center justify-between h-10 bg-bg-sidebar border-b border-border px-3 select-none shrink-0">
      <div className="flex items-center gap-2">
        {isMac && <div className="w-16" />}

        <button
          onClick={toggleSidebar}
          className="no-drag p-1.5 rounded-md hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>

        <span className="text-sm font-semibold text-text-secondary tracking-wide">
          NexClaw
        </span>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {!isMac && (
          <>
            <button
              onClick={() => window.nexClaw?.window?.minimize()}
              className="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => window.nexClaw?.window?.maximize()}
              className="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
            >
              <Square size={12} />
            </button>
            <button
              onClick={() => window.nexClaw?.window?.close()}
              className="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-text-secondary hover:text-error"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
