import { contextBridge, ipcRenderer } from 'electron'
import type { ActivitySyncPayload } from '../main/activityTypes'

export interface ProviderConfig {
  provider: string
  model: string
  apiKey: string
  baseUrl: string
}

export interface NexClawAPI {
  cli: {
    start: (workingDirectory?: string) => Promise<boolean>
    setProviderConfig: (config: ProviderConfig) => Promise<boolean>
    stop: () => Promise<boolean>
    send: (message: string, taskContext?: string) => Promise<void>
    cancel: () => Promise<void>
    approveTool: (id: string, outcome: 'once' | 'always' | 'no') => Promise<void>
    setConfig: (key: string, value: string) => Promise<void>
    status: () => Promise<boolean>
    getDangerouslySkipPermissions: () => Promise<boolean>
    setDangerouslySkipPermissions: (enabled: boolean) => Promise<boolean>
    onEvent: (callback: (event: unknown) => void) => () => void
    onStatus: (callback: (status: unknown) => void) => () => void
  }
  config: {
    readClaude: () => Promise<Record<string, unknown> | null>
    readProject: (dir: string) => Promise<Record<string, unknown> | null>
    saveTrustedFolder: (folder: string) => Promise<boolean>
    isFolderTrusted: (folder: string) => Promise<boolean>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    focusMain: () => Promise<void>
    platform: string
    appVersion: string
  }
  tasks: {
    load: (projectDir: string) => Promise<unknown[]>
    save: (projectDir: string, tasks: unknown[]) => Promise<boolean>
  }
  sessions: {
    listClaude: (workingDirectory?: string, limit?: number) => Promise<ClaudeCodeSession[]>
    readJsonl: (filePath: string) => Promise<ParsedSessionMessage[]>
  }
  dialog: {
    selectFolder: () => Promise<string | null>
  }
  activity: {
    sync: (payload: ActivitySyncPayload) => Promise<boolean>
    onFocusState: (callback: (focused: boolean) => void) => () => void
    onWidgetUpdate: (callback: (payload: ActivitySyncPayload) => void) => () => void
  }
}

export interface ClaudeCodeSession {
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

export interface ParsedSessionMessage {
  role: string
  content: string
  timestamp: string
  toolUses?: { tool: string; id: string }[]
}

const api: NexClawAPI = {
  cli: {
    start: (workingDirectory?: string) => ipcRenderer.invoke('cli:start', workingDirectory),
    setProviderConfig: (config: ProviderConfig) => ipcRenderer.invoke('cli:set-provider-config', config),
    stop: () => ipcRenderer.invoke('cli:stop'),
    send: (message: string, taskContext?: string) => ipcRenderer.invoke('cli:send', message, taskContext),
    cancel: () => ipcRenderer.invoke('cli:cancel'),
    approveTool: (id: string, outcome: 'once' | 'always' | 'no') =>
      ipcRenderer.invoke('cli:approve-tool', id, outcome),
    setConfig: (key: string, value: string) => ipcRenderer.invoke('cli:set-config', key, value),
    status: () => ipcRenderer.invoke('cli:status'),
    getDangerouslySkipPermissions: () => ipcRenderer.invoke('cli:get-dangerously-skip-permissions'),
    setDangerouslySkipPermissions: (enabled: boolean) =>
      ipcRenderer.invoke('cli:set-dangerously-skip-permissions', enabled),
    onEvent: (callback: (event: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
      ipcRenderer.on('cli:event', handler)
      return () => ipcRenderer.removeListener('cli:event', handler)
    },
    onStatus: (callback: (status: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
      ipcRenderer.on('cli:status', handler)
      return () => ipcRenderer.removeListener('cli:status', handler)
    }
  },
  config: {
    readClaude: () => ipcRenderer.invoke('config:read-claude'),
    readProject: (dir: string) => ipcRenderer.invoke('config:read-project', dir),
    saveTrustedFolder: (folder: string) => ipcRenderer.invoke('config:save-trusted-folder', folder),
    isFolderTrusted: (folder: string) => ipcRenderer.invoke('config:is-folder-trusted', folder),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    focusMain: () => ipcRenderer.invoke('window:focus-main'),
    platform: process.platform,
    appVersion: '0.1.0',
  },
  tasks: {
    load: (projectDir: string) => ipcRenderer.invoke('tasks:load', projectDir),
    save: (projectDir: string, tasks: unknown[]) => ipcRenderer.invoke('tasks:save', projectDir, tasks),
  },
  sessions: {
    listClaude: (workingDirectory?: string, limit?: number) => ipcRenderer.invoke('sessions:list-claude', workingDirectory, limit),
    readJsonl: (filePath: string) => ipcRenderer.invoke('sessions:read-jsonl', filePath),
  },
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder')
  },
  activity: {
    sync: (payload: ActivitySyncPayload) => ipcRenderer.invoke('activity:sync', payload),
    onFocusState: (callback: (focused: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, focused: boolean) => callback(focused)
      ipcRenderer.on('app:focus-state', handler)
      return () => ipcRenderer.removeListener('app:focus-state', handler)
    },
    onWidgetUpdate: (callback: (payload: ActivitySyncPayload) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: ActivitySyncPayload) =>
        callback(payload)
      ipcRenderer.on('activity:widget-update', handler)
      return () => ipcRenderer.removeListener('activity:widget-update', handler)
    },
  },
}

contextBridge.exposeInMainWorld('nexClaw', api)
