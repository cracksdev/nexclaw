import React, { useState, useEffect } from 'react'
import { TopMenu } from './components/Layout/TopMenu'
import { StatusBar } from './components/Layout/StatusBar'
import { ChatPanel } from './components/Chat/ChatPanel'
import { SessionList } from './components/Sidebar/SessionList'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { DashboardPage } from './components/Dashboard/DashboardPage'
import { TaskBoard } from './components/Tasks/TaskBoard'
import { SkillsPage } from './components/Skills/SkillsPage'
import { TrustDialog, useTrustCheck } from './components/Trust/TrustDialog'
import { useSettingsStore } from './stores/settingsStore'
import { useSessionStore } from './stores/sessionStore'
import { useNavigationStore } from './stores/navigationStore'
import { useCliSessionStore } from './stores/cliSessionStore'
import { useTaskStore } from './stores/taskStore'
import { useCliEvents } from './hooks/useCliEvents'
import { useActivityBridgeSync } from './hooks/useActivityBridgeSync'

export function App() {
  useCliEvents()
  useActivityBridgeSync()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const { sidebarOpen, workingDirectory, provider, model, apiKey, baseUrl } = useSettingsStore()
  const { activeSessionId, createSession } = useSessionStore()
  const { currentPage } = useNavigationStore()
  const { showTrustDialog, handleTrust, handleExit, currentFolder } = useTrustCheck()

  useEffect(() => {
    if (!activeSessionId) {
      createSession()
    }
  }, [activeSessionId, createSession])

  useEffect(() => {
    window.nexClaw?.cli?.setProviderConfig?.({ provider, model, apiKey, baseUrl })
  }, [provider, model, apiKey, baseUrl])

  useEffect(() => {
    window.nexClaw?.cli?.start(workingDirectory || undefined).catch(() => {})
    if (workingDirectory) {
      useTaskStore.getState().loadFromProject(workingDirectory)
    }
  }, [workingDirectory])

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await window.nexClaw?.config?.readClaude()
        if (config) {
          console.log('[App] Loaded Claude config:', Object.keys(config))
          useCliSessionStore.getState().setConfigData(config)
        }
      } catch (err) {
        console.warn('[App] Failed to load Claude config:', err)
      }
    }
    loadConfig()
  }, [])

  const showSidebar = sidebarOpen && currentPage === 'chat'

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      {showTrustDialog && currentFolder && (
        <TrustDialog
          folder={currentFolder}
          onTrust={handleTrust}
          onExit={handleExit}
        />
      )}

      <TopMenu onSettingsClick={() => setSettingsOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <div className="w-70 border-r border-border shrink-0 overflow-hidden">
            <SessionList />
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {currentPage === 'chat' && (
            <ChatPanel onOpenSettings={() => setSettingsOpen(true)} />
          )}
          {currentPage === 'dashboard' && <DashboardPage />}
          {currentPage === 'tasks' && <TaskBoard />}
          {currentPage === 'skills' && <SkillsPage />}
        </div>
      </div>

      <StatusBar />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
