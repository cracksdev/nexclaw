import React, { useState } from 'react'
import {
  MessageSquare,
  LayoutDashboard,
  CheckSquare,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Minus,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { useNavigationStore, type Page } from '../../stores/navigationStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useCliSessionStore } from '../../stores/cliSessionStore'

interface TopMenuProps {
  onSettingsClick: () => void
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'skills', label: 'Skills', icon: Sparkles },
]

export function TopMenu({ onSettingsClick }: TopMenuProps) {
  const { currentPage, setPage } = useNavigationStore()
  const { sidebarOpen, toggleSidebar } = useSettingsStore()
  const { activeModel, initialized } = useCliSessionStore()
  const platform = window.nexClaw?.window?.platform ?? 'win32'
  const isMac = platform === 'darwin'
  const version = window.nexClaw?.window?.appVersion ?? '0.1.0'
  const [isMaximized, setIsMaximized] = useState(false)

  const handleMaximize = () => {
    window.nexClaw?.window?.maximize()
    setIsMaximized((prev) => !prev)
  }

  const modelLabel = activeModel
    ? activeModel.replace('claude-', '').replace(/-\d{8}$/, '').replace(/-/g, ' ')
    : 'claude sonnet 4'

  return (
    <div
      className="grid grid-cols-[auto_minmax(40px,1fr)_auto_minmax(40px,1fr)_auto] items-center h-11 bg-bg-primary border-b border-border/60 pl-3 pr-1.5 select-none shrink-0"
    >
      {/* Left: Sidebar toggle + App icon + version (clicks must not steal drag) */}
      <div className="flex items-center gap-2 no-drag">
        {isMac && <div className="w-16" />}

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
        </button>

        {/* App icon placeholder + model + version badge */}
        <div className="flex items-center gap-2 ml-0.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <img src="/src/styles/logo.png" alt="NexClaw" className="w-full h-full object-fill rounded-full" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-text-primary capitalize tracking-tight">{modelLabel}</span>
            <span className="text-[9px] font-medium text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded-full border border-border/50">
              v{version}
            </span>
            {initialized && (
              <div className="w-1.5 h-1.5 rounded-full bg-success" title="Connected" />
            )}
          </div>
        </div>
      </div>

      {/* Draggable gutter (frameless Windows needs real drag targets; no-drag children block parent drag) */}
      <div className="drag-region min-h-[44px] w-full" aria-hidden />

      {/* Center: Navigation pills */}
      <div className="no-drag flex justify-center">
        <div className="flex items-center gap-0.5 bg-bg-secondary/80 rounded-xl p-[3px] border border-border/40">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`
                flex items-center gap-1.5 px-3.5 py-[5px] rounded-[10px] text-[11px] font-medium transition-all
                ${currentPage === id
                  ? 'bg-white text-text-primary shadow-sm border border-border/50'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover/60'
                }
              `}
            >
              <Icon size={13} className={currentPage === id ? 'text-accent' : ''} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="drag-region min-h-[44px] w-full" aria-hidden />

      {/* Right: Settings + Window controls */}
      <div className="flex items-center gap-0.5 no-drag justify-end">
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
          title="Settings"
        >
          <Settings size={15} />
        </button>

        {!isMac && (
          <div className="flex items-center ml-1.5 gap-px">
            <button
              onClick={() => window.nexClaw?.window?.minimize()}
              className="group w-[34px] h-[28px] flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
              title="Minimize"
            >
              <Minus size={13} className="text-text-muted group-hover:text-text-primary" />
            </button>
            <button
              onClick={handleMaximize}
              className="group w-[34px] h-[28px] flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <Minimize2 size={12} className="text-text-muted group-hover:text-text-primary" />
              ) : (
                <Maximize2 size={12} className="text-text-muted group-hover:text-text-primary" />
              )}
            </button>
            <button
              onClick={() => window.nexClaw?.window?.close()}
              className="group w-[34px] h-[28px] flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
              title="Close"
            >
              <X size={14} className="text-text-muted group-hover:text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
