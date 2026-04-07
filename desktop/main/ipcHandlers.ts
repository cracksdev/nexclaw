import { ipcMain, BrowserWindow, dialog } from 'electron'
import { syncBackgroundActivity } from './activityBridge'
import type { ActivitySyncPayload } from './activityTypes'
import { getMainWindow } from './mainWindowRef'
import { readFile, access, readdir, stat, open as fsOpen } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import type { CliManager, ProviderConfig } from './cliManager'

function dbg(tag: string, ...args: unknown[]): void {
  console.log(`[IPC:${tag}]`, ...args)
}

async function readJsonSafe(path: string): Promise<unknown> {
  try {
    const data = await readFile(path, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// ── Claude Code session scanning ──

const MAX_SANITIZED_LENGTH = 200

function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized
  let h = 5381
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) | 0
  }
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${Math.abs(h).toString(36)}`
}

function isValidUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function extractField(text: string, field: string): string | null {
  // Try both compact ("field":"value") and spaced ("field": "value") formats
  for (const pattern of [`"${field}":"`, `"${field}": "`]) {
    // Search from the end (last occurrence wins for tail fields)
    let idx = text.lastIndexOf(pattern)
    if (idx < 0) idx = text.indexOf(pattern)
    if (idx < 0) continue

    const valStart = idx + pattern.length
    let end = valStart
    while (end < text.length) {
      if (text[end] === '"' && text[end - 1] !== '\\') break
      end++
    }
    if (end >= text.length) continue
    return text.slice(valStart, end)
  }
  return null
}

interface ClaudeSession {
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

const LITE_BUF_SIZE = 16384

async function readSessionLite(filePath: string): Promise<{
  head: string; tail: string; mtime: number; size: number
} | null> {
  try {
    const fh = await fsOpen(filePath, 'r')
    try {
      const s = await fh.stat()
      const buf = Buffer.allocUnsafe(LITE_BUF_SIZE)
      const headResult = await fh.read(buf, 0, LITE_BUF_SIZE, 0)
      if (headResult.bytesRead === 0) return null

      const head = buf.toString('utf8', 0, headResult.bytesRead)
      const tailOffset = Math.max(0, s.size - LITE_BUF_SIZE)
      let tail = head
      if (tailOffset > 0) {
        const tailResult = await fh.read(buf, 0, LITE_BUF_SIZE, tailOffset)
        tail = buf.toString('utf8', 0, tailResult.bytesRead)
      }
      return { head, tail, mtime: s.mtime.getTime(), size: s.size }
    } finally {
      await fh.close()
    }
  } catch {
    return null
  }
}

function parseSessionInfo(sessionId: string, lite: { head: string; tail: string; mtime: number; size: number }, fullPath: string): ClaudeSession | null {
  const { head, tail, mtime } = lite

  const firstNewline = head.indexOf('\n')
  const firstLine = firstNewline >= 0 ? head.slice(0, firstNewline) : head
  if (firstLine.includes('"isSidechain":true') || firstLine.includes('"isSidechain": true')) {
    return null
  }

  const customTitle =
    extractField(tail, 'customTitle') ||
    extractField(head, 'customTitle') ||
    extractField(tail, 'aiTitle') ||
    extractField(head, 'aiTitle') ||
    null

  const lastPrompt = extractField(tail, 'lastPrompt')
  const summaryField = extractField(tail, 'summary')

  let firstPrompt: string | null = null
  // Find first user message: entries with "type":"user" and "message":{"role":"user","content":"..."}
  // Try extracting the content string directly  
  const userTypeIdx = head.indexOf('"type":"user"')
  const userTypeIdx2 = head.indexOf('"type": "user"')
  const userIdx = Math.min(
    userTypeIdx >= 0 ? userTypeIdx : Infinity,
    userTypeIdx2 >= 0 ? userTypeIdx2 : Infinity,
  )
  if (userIdx < Infinity) {
    const after = head.slice(userIdx)
    // content can be a simple string: "content":"actual text"
    const contentMatch = after.match(/"content"\s*:\s*"([^"]{3,}(?:\\.[^"]*)*)"/)
    if (contentMatch) {
      firstPrompt = contentMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, ' ')
        .replace(/<[^>]+>/g, '')
        .trim()
        .substring(0, 200)
      if (firstPrompt.length < 3) firstPrompt = null
    }
  }

  const summary = customTitle || lastPrompt || summaryField || firstPrompt
  if (!summary) return null

  const timestampStr = extractField(head, 'timestamp')
  let createdAt: number | undefined
  if (timestampStr) {
    const parsed = Date.parse(timestampStr)
    if (!Number.isNaN(parsed)) createdAt = parsed
  }

  const gitBranch = extractField(tail, 'gitBranch') || extractField(head, 'gitBranch') || undefined
  const cwd = extractField(head, 'cwd') || undefined

  return {
    sessionId,
    summary: summary.substring(0, 200),
    lastModified: mtime,
    createdAt,
    firstPrompt: firstPrompt?.substring(0, 200) || undefined,
    customTitle: customTitle || undefined,
    cwd,
    gitBranch,
    fullPath,
  }
}

async function listClaudeCodeSessions(workingDirectory?: string, limit = 20): Promise<ClaudeSession[]> {
  const claudeDir = join(homedir(), '.claude')
  const projectsDir = join(claudeDir, 'projects')

  if (!(await fileExists(projectsDir))) return []

  let projectDirs: string[] = []

  if (workingDirectory) {
    const sanitized = sanitizePath(workingDirectory)
    const specificDir = join(projectsDir, sanitized)
    if (await fileExists(specificDir)) {
      projectDirs.push(specificDir)
    }
    // Also scan all project dirs for broader results
    try {
      const allDirs = await readdir(projectsDir, { withFileTypes: true })
      for (const d of allDirs) {
        if (d.isDirectory()) {
          const fullDir = join(projectsDir, d.name)
          if (fullDir !== specificDir) {
            projectDirs.push(fullDir)
          }
        }
      }
    } catch {}
  } else {
    try {
      const allDirs = await readdir(projectsDir, { withFileTypes: true })
      for (const d of allDirs) {
        if (d.isDirectory()) {
          projectDirs.push(join(projectsDir, d.name))
        }
      }
    } catch { return [] }
  }

  type Candidate = { sessionId: string; filePath: string; mtime: number }
  const candidates: Candidate[] = []

  for (const dir of projectDirs) {
    try {
      const files = await readdir(dir)
      for (const f of files) {
        if (!f.endsWith('.jsonl')) continue
        const sid = f.slice(0, -6)
        if (!isValidUuid(sid)) continue
        const fp = join(dir, f)
        try {
          const s = await stat(fp)
          candidates.push({ sessionId: sid, filePath: fp, mtime: s.mtime.getTime() })
        } catch {}
      }
    } catch {}
  }

  candidates.sort((a, b) => b.mtime - a.mtime)
  const topCandidates = candidates.slice(0, limit * 2)

  const sessions: ClaudeSession[] = []
  for (const c of topCandidates) {
    if (sessions.length >= limit) break
    const lite = await readSessionLite(c.filePath)
    if (!lite) continue
    const info = parseSessionInfo(c.sessionId, lite, c.filePath)
    if (info) sessions.push(info)
  }

  return sessions
}

async function readClaudeConfig(): Promise<Record<string, unknown>> {
  const claudeDir = join(homedir(), '.claude')
  const result: Record<string, unknown> = {}

  const settings = await readJsonSafe(join(claudeDir, 'settings.json'))
  if (settings) result.settings = settings

  const settingsLocal = await readJsonSafe(join(claudeDir, 'settings.local.json'))
  if (settingsLocal) result.settingsLocal = settingsLocal

  const knownMarketplaces = await readJsonSafe(join(claudeDir, 'plugins', 'known_marketplaces.json'))
  if (knownMarketplaces) result.knownMarketplaces = knownMarketplaces

  const plugins: Record<string, unknown>[] = []
  const enabledPlugins = (settings as Record<string, unknown>)?.enabledPlugins as Record<string, boolean> | undefined

  if (knownMarketplaces && typeof knownMarketplaces === 'object') {
    for (const [key, val] of Object.entries(knownMarketplaces as Record<string, unknown>)) {
      const entry = val as Record<string, unknown>
      const installLocation = entry?.installLocation as string
      const source = entry?.source as Record<string, unknown>

      let pluginName = key
      let version = ''

      if (installLocation) {
        const pluginJsonPath = join(installLocation, 'plugin', '.claude-plugin', 'plugin.json')
        const pluginMeta = await readJsonSafe(pluginJsonPath) as Record<string, unknown> | null
        if (pluginMeta) {
          pluginName = (pluginMeta.name as string) || key
          version = (pluginMeta.version as string) || ''
        }
      }

      let mcpServers: Record<string, unknown> = {}
      if (installLocation) {
        const mcpPath = join(installLocation, 'plugin', '.mcp.json')
        const mcpData = await readJsonSafe(mcpPath) as Record<string, unknown> | null
        if (mcpData?.mcpServers) {
          mcpServers = mcpData.mcpServers as Record<string, unknown>
        }
      }

      let enabled = true
      if (enabledPlugins) {
        const pluginKey = `${pluginName}@${key}`
        for (const [k, v] of Object.entries(enabledPlugins)) {
          if (k === pluginKey || k.includes(key) || k.includes(pluginName)) {
            enabled = v
            break
          }
        }
      }

      plugins.push({
        name: pluginName,
        marketplace: key,
        version,
        enabled,
        source: source?.repo || '',
        mcpServers: Object.keys(mcpServers),
      })
    }
  }
  result.plugins = plugins

  const mcpServers: Record<string, unknown>[] = []
  const authCache = await readJsonSafe(join(claudeDir, 'mcp-needs-auth-cache.json')) as Record<string, unknown> | null
  if (authCache) {
    for (const name of Object.keys(authCache)) {
      mcpServers.push({ name, status: 'connected', source: 'claude.ai' })
    }
  }

  for (const plugin of plugins) {
    const pluginMcpNames = plugin.mcpServers as string[]
    for (const name of pluginMcpNames) {
      if (!mcpServers.find((s) => s.name === name)) {
        mcpServers.push({ name, status: 'available', source: `plugin:${plugin.name}` })
      }
    }
  }
  result.mcpServers = mcpServers

  const skillsDirs = [
    join(claudeDir, 'skills'),
    join(homedir(), '.cursor', 'skills-cursor'),
  ]
  const skills: { name: string; path: string; description: string; source: string }[] = []

  for (const dir of skillsDirs) {
    if (await fileExists(dir)) {
      const source = dir.includes('.cursor') ? 'cursor' : 'claude'
      try {
        const names = await readdir(dir)
        for (const name of names) {
          const entryPath = join(dir, name)
          try {
            // Use stat() instead of dirent.isDirectory() to follow symlinks/junctions
            const s = await stat(entryPath)
            if (s.isDirectory()) {
              const skillFile = join(entryPath, 'SKILL.md')
              if (await fileExists(skillFile)) {
                let description = ''
                try {
                  const content = await readFile(skillFile, 'utf-8')
                  const firstLine = content.split('\n').find((l: string) => l.trim() && !l.startsWith('#'))
                  description = firstLine?.trim().substring(0, 200) || ''
                } catch {}
                skills.push({ name, path: skillFile, description, source })
              }
            }
          } catch {}
        }
      } catch {}
    }
  }
  result.skills = skills

  const trustedFolders = await readJsonSafe(join(claudeDir, 'trusted_folders.json'))
  result.trustedFolders = Array.isArray(trustedFolders) ? trustedFolders : []

  return result
}

async function readProjectConfig(projectDir: string): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}

  const claudeMd = join(projectDir, 'CLAUDE.md')
  result.hasClaudeMd = await fileExists(claudeMd)

  const projectClaudeDir = join(projectDir, '.claude')
  result.hasProjectClaudeDir = await fileExists(projectClaudeDir)

  if (result.hasProjectClaudeDir) {
    const projectSettings = await readJsonSafe(join(projectClaudeDir, 'settings.json'))
    if (projectSettings) result.projectSettings = projectSettings

    const projectSkillsDir = join(projectClaudeDir, 'skills')
    if (await fileExists(projectSkillsDir)) {
      const skills: { name: string; path: string }[] = []
      try {
        const names = await readdir(projectSkillsDir)
        for (const name of names) {
          const entryPath = join(projectSkillsDir, name)
          try {
            const s = await stat(entryPath)
            if (s.isDirectory()) {
              const skillFile = join(entryPath, 'SKILL.md')
              if (await fileExists(skillFile)) {
                skills.push({ name, path: skillFile })
              }
            }
          } catch {}
        }
      } catch {}
      result.projectSkills = skills
    }
  }

  return result
}

export function registerIpcHandlers(cliManager: CliManager): void {
  ipcMain.handle('cli:start', async (_event, workingDirectory?: string) => {
    dbg('cli:start', 'workingDirectory=', workingDirectory)
    return cliManager.start(workingDirectory)
  })

  ipcMain.handle('cli:stop', async () => {
    dbg('cli:stop')
    cliManager.stop()
    return true
  })

  ipcMain.handle('cli:send', async (_event, message: string, taskContext?: string) => {
    dbg('cli:send', 'message=', message.substring(0, 100), 'hasTaskCtx=', !!taskContext)
    const fullMessage = taskContext
      ? `${taskContext}\n\n${message}`
      : message
    cliManager.send({ type: 'send_message', id: crypto.randomUUID(), content: fullMessage })
  })

  ipcMain.handle('cli:cancel', async () => {
    dbg('cli:cancel')
    cliManager.send({ type: 'cancel' })
  })

  ipcMain.handle(
    'cli:approve-tool',
    async (_event, id: string, outcome: 'once' | 'always' | 'no') => {
      dbg('cli:approve-tool', 'id=', id, 'outcome=', outcome)
      cliManager.send({ type: 'tool_response', id, permissionOutcome: outcome })
    },
  )

  ipcMain.handle('cli:set-config', async (_event, key: string, value: string) => {
    dbg('cli:set-config', key, '=', value)
    cliManager.send({ type: 'set_config', key, value })
  })

  ipcMain.handle('cli:set-provider-config', async (_event, config: ProviderConfig) => {
    dbg('cli:set-provider-config', 'provider=', config.provider, 'model=', config.model)
    cliManager.setProviderConfig(config)
    return true
  })

  ipcMain.handle('cli:status', async () => {
    const running = cliManager.isRunning()
    dbg('cli:status', 'running=', running)
    return running
  })

  ipcMain.handle('cli:get-dangerously-skip-permissions', async () => {
    return cliManager.getDangerouslySkipPermissions()
  })

  ipcMain.handle('cli:set-dangerously-skip-permissions', async (_event, enabled: boolean) => {
    dbg('cli:set-dangerously-skip-permissions', 'enabled=', enabled)
    cliManager.setDangerouslySkipPermissions(Boolean(enabled))
    return cliManager.getDangerouslySkipPermissions()
  })

  ipcMain.handle('dialog:select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Working Directory'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    dbg('dialog:select-folder', 'selected=', result.filePaths[0])
    return result.filePaths[0]
  })

  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  ipcMain.handle('window:focus-main', () => {
    const w = getMainWindow()
    if (w && !w.isDestroyed()) {
      w.show()
      w.focus()
    }
  })

  ipcMain.handle('activity:sync', (_event, payload: ActivitySyncPayload) => {
    syncBackgroundActivity(payload)
    return true
  })

  ipcMain.handle('config:read-claude', async () => {
    dbg('config:read-claude', 'reading ~/.claude/ config')
    try {
      const config = await readClaudeConfig()
      dbg('config:read-claude', 'mcpServers=', (config.mcpServers as unknown[])?.length,
        'plugins=', (config.plugins as unknown[])?.length,
        'skills=', (config.skills as unknown[])?.length)
      return config
    } catch (err) {
      dbg('config:read-claude', 'error:', err)
      return null
    }
  })

  ipcMain.handle('config:read-project', async (_event, projectDir: string) => {
    dbg('config:read-project', 'dir=', projectDir)
    try {
      return await readProjectConfig(projectDir)
    } catch (err) {
      dbg('config:read-project', 'error:', err)
      return null
    }
  })

  ipcMain.handle('config:save-trusted-folder', async (_event, folder: string) => {
    const claudeDir = join(homedir(), '.claude')
    const trustedPath = join(claudeDir, 'trusted_folders.json')
    try {
      const existing = await readJsonSafe(trustedPath) as string[] | null
      const folders = Array.isArray(existing) ? existing : []
      const normalized = folder.replace(/\\/g, '/').toLowerCase()
      if (!folders.some((f: string) => f.replace(/\\/g, '/').toLowerCase() === normalized)) {
        folders.push(folder)
        const { writeFile, mkdir } = await import('fs/promises')
        await mkdir(claudeDir, { recursive: true })
        await writeFile(trustedPath, JSON.stringify(folders, null, 2), 'utf-8')
        dbg('config:save-trusted-folder', 'saved:', folder)
      }
      return true
    } catch (err) {
      dbg('config:save-trusted-folder', 'error:', err)
      return false
    }
  })

  ipcMain.handle('tasks:load', async (_event, projectDir: string) => {
    const tasksPath = join(projectDir, '.nexclaw', 'tasks.json')
    dbg('tasks:load', 'path=', tasksPath)
    try {
      const data = await readJsonSafe(tasksPath)
      if (Array.isArray(data)) {
        dbg('tasks:load', 'loaded', data.length, 'tasks')
        return data
      }
      return []
    } catch (err) {
      dbg('tasks:load', 'error:', err)
      return []
    }
  })

  ipcMain.handle('tasks:save', async (_event, projectDir: string, tasks: unknown[]) => {
    const ocDir = join(projectDir, '.nexclaw')
    const tasksPath = join(ocDir, 'tasks.json')
    dbg('tasks:save', 'path=', tasksPath, 'count=', tasks.length)
    try {
      const { writeFile, mkdir } = await import('fs/promises')
      await mkdir(ocDir, { recursive: true })
      await writeFile(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8')
      return true
    } catch (err) {
      dbg('tasks:save', 'error:', err)
      return false
    }
  })

  ipcMain.handle('sessions:list-claude', async (_event, workingDirectory?: string, limit?: number) => {
    dbg('sessions:list-claude', 'dir=', workingDirectory, 'limit=', limit)
    try {
      const sessions = await listClaudeCodeSessions(workingDirectory, limit || 20)
      dbg('sessions:list-claude', 'found', sessions.length, 'sessions')
      return sessions
    } catch (err) {
      dbg('sessions:list-claude', 'error:', err)
      return []
    }
  })

  ipcMain.handle('sessions:read-jsonl', async (_event, filePath: string) => {
    dbg('sessions:read-jsonl', 'path=', filePath)
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n').filter(Boolean)

      interface ParsedEntry {
        type?: string
        uuid?: string
        parentUuid?: string | null
        isSidechain?: boolean
        isMeta?: boolean
        message?: {
          role?: string
          content?: string | ContentBlock[]
        }
        timestamp?: string
      }

      interface ContentBlock {
        type: string
        text?: string
        name?: string
        id?: string
        input?: Record<string, unknown>
      }

      interface ParsedMessage {
        uuid: string
        parentUuid: string | null
        role: 'user' | 'assistant'
        content: string
        timestamp: string
        toolUses?: { tool: string; id: string }[]
      }

      const allEntries: ParsedEntry[] = []
      for (const line of lines) {
        try {
          allEntries.push(JSON.parse(line))
        } catch {}
      }

      const messageEntries = allEntries.filter((e) =>
        (e.type === 'user' || e.type === 'assistant') &&
        !e.isSidechain &&
        !e.isMeta
      )

      const messages: ParsedMessage[] = []
      for (const entry of messageEntries) {
        const msg = entry.message
        if (!msg) continue

        const role = entry.type === 'assistant' ? 'assistant' : 'user'
        let text = ''
        const toolUses: { tool: string; id: string }[] = []

        if (typeof msg.content === 'string') {
          text = msg.content
        } else if (Array.isArray(msg.content)) {
          const textParts: string[] = []
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              textParts.push(block.text)
            } else if (block.type === 'tool_use' && block.name) {
              toolUses.push({ tool: block.name, id: block.id || '' })
            }
          }
          text = textParts.join('\n')

          if (!text && role === 'user') {
            const hasToolResults = msg.content.some((b: ContentBlock) => b.type === 'tool_result')
            if (hasToolResults) continue
          }
        }

        if (!text.trim() && role === 'user') continue
        if (!text.trim() && role === 'assistant' && toolUses.length === 0) continue

        if (!text.trim() && role === 'assistant' && toolUses.length > 0) {
          text = toolUses.map((t) => `Used tool: ${t.tool}`).join('\n')
        }

        messages.push({
          uuid: entry.uuid || '',
          parentUuid: entry.parentUuid ?? null,
          role,
          content: text,
          timestamp: entry.timestamp || new Date().toISOString(),
          toolUses: toolUses.length > 0 ? toolUses : undefined,
        })
      }

      // Build chain from parentUuid links to get correct conversation order
      const byUuid = new Map(messages.map((m) => [m.uuid, m]))
      const childMap = new Map<string | null, ParsedMessage[]>()
      for (const m of messages) {
        const parent = m.parentUuid || null
        if (!childMap.has(parent)) childMap.set(parent, [])
        childMap.get(parent)!.push(m)
      }

      const ordered: ParsedMessage[] = []
      const visited = new Set<string>()

      function walkChain(uuid: string | null) {
        const children = childMap.get(uuid) || []
        for (const child of children) {
          if (visited.has(child.uuid)) continue
          visited.add(child.uuid)
          ordered.push(child)
          walkChain(child.uuid)
        }
      }

      walkChain(null)

      // Fallback: if chain-walk missed messages (broken chain), add by timestamp
      if (ordered.length < messages.length) {
        for (const m of messages) {
          if (!visited.has(m.uuid)) {
            ordered.push(m)
          }
        }
      }

      const result = ordered.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        toolUses: m.toolUses,
      }))

      dbg('sessions:read-jsonl', 'parsed', result.length, 'messages from', lines.length, 'lines',
        '(user:', result.filter(m => m.role === 'user').length,
        'assistant:', result.filter(m => m.role === 'assistant').length, ')')
      return result
    } catch (err) {
      dbg('sessions:read-jsonl', 'error:', err)
      return []
    }
  })

  ipcMain.handle('config:is-folder-trusted', async (_event, folder: string) => {
    const claudeDir = join(homedir(), '.claude')
    const trustedPath = join(claudeDir, 'trusted_folders.json')
    try {
      const existing = await readJsonSafe(trustedPath) as string[] | null
      if (!Array.isArray(existing)) return false
      const normalized = folder.replace(/\\/g, '/').toLowerCase()
      return existing.some((f: string) => f.replace(/\\/g, '/').toLowerCase() === normalized)
    } catch {
      return false
    }
  })

  cliManager.on('event', (event) => {
    dbg('forward-event', 'event=', event.event, Object.keys(event).join(','))
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('cli:event', event)
    }
  })

  cliManager.on('status', (status) => {
    dbg('forward-status', status)
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('cli:status', status)
    }
  })
}
