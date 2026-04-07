/// <reference types="vite/client" />

interface ActivitySyncPayload {
  brief: string
  isStreaming: boolean
  sessionInputTokens: number
  sessionOutputTokens: number
  lastTurnInput?: number
  lastTurnOutput?: number
}

interface NexClawAPI {
  cli: {
    start: (workingDirectory?: string) => Promise<boolean>
    stop: () => Promise<boolean>
    send: (message: string, taskContext?: string) => Promise<void>
    cancel: () => Promise<void>
    approveTool: (id: string, outcome: 'once' | 'always' | 'no') => Promise<void>
    setConfig: (key: string, value: string) => Promise<void>
    status: () => Promise<boolean>
    getDangerouslySkipPermissions: () => Promise<boolean>
    setDangerouslySkipPermissions: (enabled: boolean) => Promise<boolean>
    onEvent: (callback: (event: CliEvent) => void) => () => void
    onStatus: (callback: (status: CliStatus) => void) => () => void
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

interface ClaudeCodeSession {
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

interface ParsedSessionMessage {
  role: string
  content: string
  timestamp: string
  toolUses?: { tool: string; id: string }[]
}

interface CliEvent {
  event: string
  [key: string]: unknown
}

interface CliStatus {
  running: boolean
  code?: number | null
  signal?: string | null
}

interface Window {
  nexClaw: NexClawAPI
}
