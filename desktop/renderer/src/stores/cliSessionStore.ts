import { create } from 'zustand'

export interface McpServer {
  name: string
  status: string
  enabled: boolean
  tools: string[]
  rawName: string
}

export interface SkillDef {
  name: string
  path: string
  enabled: boolean
  description?: string
  source?: string
}

export interface PluginDef {
  name: string
  enabled: boolean
  [key: string]: unknown
}

interface CliSessionState {
  cwd: string
  sessionId: string
  tools: string[]
  mcpServers: McpServer[]
  activeModel: string
  permissionMode: string
  claudeCodeVersion: string
  apiKeySource: string
  skills: SkillDef[]
  plugins: PluginDef[]
  slashCommands: string[]
  initialized: boolean
  configLoaded: boolean

  setInitData: (data: Record<string, unknown>) => void
  setConfigData: (config: Record<string, unknown>) => void
  toggleMcpServer: (name: string) => void
  toggleSkill: (name: string) => void
  togglePlugin: (name: string) => void
  reset: () => void
}

function normalizeMcpKey(name: string): string {
  return name.replace(/[\s.-]/g, '_')
}

function parseMcpServers(rawServers: unknown, allTools: string[]): McpServer[] {
  if (!Array.isArray(rawServers)) return []

  return rawServers.map((s: Record<string, unknown>) => {
    const name = (s.name as string) || 'Unknown'
    const key = normalizeMcpKey(name)
    const serverTools = allTools.filter((t) => {
      const lower = t.toLowerCase()
      const keyLower = key.toLowerCase()
      return lower.startsWith(`mcp__${keyLower}__`) || lower.startsWith(`mcp_${keyLower}_`)
    })
    return {
      name,
      rawName: key,
      status: (s.status as string) || 'connected',
      enabled: true,
      tools: serverTools
    }
  })
}

function parseSkills(raw: unknown): SkillDef[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s) => {
    if (typeof s === 'string') {
      return { name: s, path: s, enabled: true }
    }
    if (typeof s === 'object' && s) {
      const obj = s as Record<string, unknown>
      return {
        name: (obj.name as string) || (obj.path as string) || String(s),
        path: (obj.path as string) || '',
        enabled: true
      }
    }
    return { name: String(s), path: '', enabled: true }
  })
}

function parsePlugins(raw: unknown): PluginDef[] {
  if (!Array.isArray(raw)) return []
  return raw.map((p) => {
    if (typeof p === 'string') {
      return { name: p, enabled: true }
    }
    if (typeof p === 'object' && p) {
      const obj = p as Record<string, unknown>
      return { name: (obj.name as string) || String(p), enabled: true, ...obj }
    }
    return { name: String(p), enabled: true }
  })
}

function parseConfigMcpServers(raw: unknown): McpServer[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s: Record<string, unknown>) => ({
    name: (s.name as string) || 'Unknown',
    rawName: normalizeMcpKey((s.name as string) || 'Unknown'),
    status: (s.status as string) || 'connected',
    enabled: true,
    tools: [],
  }))
}

function parseConfigPlugins(raw: unknown): PluginDef[] {
  if (!Array.isArray(raw)) return []
  return raw.map((p: Record<string, unknown>) => ({
    name: (p.name as string) || 'Unknown',
    enabled: p.enabled !== false,
    marketplace: (p.marketplace as string) || '',
    version: (p.version as string) || '',
    source: (p.source as string) || '',
  }))
}

function parseConfigSkills(raw: unknown): SkillDef[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s: Record<string, unknown>) => ({
    name: (s.name as string) || 'Unknown',
    path: (s.path as string) || '',
    enabled: true,
    description: (s.description as string) || '',
    source: (s.source as string) || 'claude',
  }))
}

export const useCliSessionStore = create<CliSessionState>((set) => ({
  cwd: '',
  sessionId: '',
  tools: [],
  mcpServers: [],
  activeModel: '',
  permissionMode: '',
  claudeCodeVersion: '',
  apiKeySource: '',
  skills: [],
  plugins: [],
  slashCommands: [],
  initialized: false,
  configLoaded: false,

  setConfigData: (config) => {
    set((state) => {
      if (state.initialized) return state
      return {
        mcpServers: parseConfigMcpServers(config.mcpServers),
        plugins: parseConfigPlugins(config.plugins),
        skills: parseConfigSkills(config.skills),
        configLoaded: true,
      }
    })
  },

  setInitData: (data) => {
    const allTools = Array.isArray(data.tools) ? data.tools.map(String) : []
    set({
      cwd: (data.cwd as string) || '',
      sessionId: (data.session_id as string) || '',
      tools: allTools,
      mcpServers: parseMcpServers(data.mcp_servers, allTools),
      activeModel: (data.model as string) || '',
      permissionMode: (data.permissionMode as string) || '',
      claudeCodeVersion: (data.claude_code_version as string) || '',
      apiKeySource: (data.apiKeySource as string) || '',
      skills: parseSkills(data.skills),
      plugins: parsePlugins(data.plugins),
      slashCommands: Array.isArray(data.slash_commands) ? data.slash_commands.map(String) : [],
      initialized: true,
      configLoaded: true,
    })
  },

  toggleMcpServer: (name) =>
    set((state) => ({
      mcpServers: state.mcpServers.map((s) =>
        s.name === name ? { ...s, enabled: !s.enabled } : s
      )
    })),

  toggleSkill: (name) =>
    set((state) => ({
      skills: state.skills.map((s) =>
        s.name === name ? { ...s, enabled: !s.enabled } : s
      )
    })),

  togglePlugin: (name) =>
    set((state) => ({
      plugins: state.plugins.map((p) =>
        p.name === name ? { ...p, enabled: !p.enabled } : p
      )
    })),

  reset: () =>
    set({
      cwd: '',
      sessionId: '',
      tools: [],
      mcpServers: [],
      activeModel: '',
      permissionMode: '',
      claudeCodeVersion: '',
      apiKeySource: '',
      skills: [],
      plugins: [],
      slashCommands: [],
      initialized: false,
      configLoaded: false,
    })
}))
