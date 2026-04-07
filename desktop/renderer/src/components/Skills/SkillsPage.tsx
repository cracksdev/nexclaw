import React, { useState } from 'react'
import {
  Search,
  Plug,
  Terminal,
  FileText,
  Globe,
  Sparkles,
  Wrench,
  Puzzle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Info
} from 'lucide-react'
import { useCliSessionStore, type McpServer, type SkillDef, type PluginDef } from '../../stores/cliSessionStore'

type Tab = 'mcp' | 'skills' | 'plugins' | 'tools'

function McpServerCard({ server, onToggle }: { server: McpServer; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      server.enabled ? 'border-border bg-bg-primary' : 'border-border/50 bg-bg-secondary/50 opacity-60'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`p-2 rounded-lg ${server.enabled ? 'bg-accent/10' : 'bg-bg-secondary'}`}>
          <Plug size={16} className={server.enabled ? 'text-accent' : 'text-text-muted'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{server.name}</p>
          <p className="text-[10px] text-text-muted">
            {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
            {server.status && server.status !== 'connected' ? ` · ${server.status}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {server.tools.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <button
            onClick={onToggle}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              server.enabled ? 'bg-accent' : 'bg-border'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              server.enabled ? 'left-[18px]' : 'left-0.5'
            }`} />
          </button>
        </div>
      </div>
      {expanded && server.tools.length > 0 && (
        <div className="border-t border-border px-4 py-2.5 bg-bg-secondary/30">
          <div className="flex flex-wrap gap-1.5">
            {server.tools.map((tool) => {
              const short = tool.replace(/^mcp__[^_]+__/, '').replace(/^mcp_[^_]+_/, '')
              return (
                <span key={tool} className="text-[10px] px-2 py-0.5 rounded-md bg-bg-primary border border-border text-text-secondary font-mono">
                  {short}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SkillCard({ skill, onToggle }: { skill: SkillDef; onToggle: () => void }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all ${
      skill.enabled ? 'border-border bg-bg-primary' : 'border-border/50 bg-bg-secondary/50 opacity-60'
    }`}>
      <div className={`p-2 rounded-lg ${skill.enabled ? 'bg-accent/10' : 'bg-bg-secondary'}`}>
        <Sparkles size={16} className={skill.enabled ? 'text-accent' : 'text-text-muted'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary truncate">{skill.name}</p>
          {skill.source && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              skill.source === 'cursor' ? 'bg-purple-50 text-purple-500' : 'bg-accent/10 text-accent'
            }`}>
              {skill.source === 'cursor' ? 'Cursor' : 'Claude'}
            </span>
          )}
        </div>
        {skill.description && (
          <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{skill.description}</p>
        )}
        {skill.path && !skill.description && (
          <p className="text-[10px] text-text-muted font-mono truncate mt-0.5">{skill.path}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          skill.enabled ? 'bg-accent' : 'bg-border'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          skill.enabled ? 'left-[18px]' : 'left-0.5'
        }`} />
      </button>
    </div>
  )
}

function PluginCard({ plugin, onToggle }: { plugin: PluginDef; onToggle: () => void }) {
  const version = plugin.version as string | undefined
  const marketplace = plugin.marketplace as string | undefined
  const source = plugin.source as string | undefined

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all ${
      plugin.enabled ? 'border-border bg-bg-primary' : 'border-border/50 bg-bg-secondary/50 opacity-60'
    }`}>
      <div className={`p-2 rounded-lg ${plugin.enabled ? 'bg-tool-bash/10' : 'bg-bg-secondary'}`}>
        <Puzzle size={16} className={plugin.enabled ? 'text-tool-bash' : 'text-text-muted'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{plugin.name}</p>
        <p className="text-[10px] text-text-muted truncate">
          {version && `v${version}`}
          {marketplace && ` · ${marketplace}`}
          {source && ` · ${source}`}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          plugin.enabled ? 'bg-accent' : 'bg-border'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          plugin.enabled ? 'left-[18px]' : 'left-0.5'
        }`} />
      </button>
    </div>
  )
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  bash: Terminal, edit: FileText, write: FileText, read: FileText,
  glob: Search, grep: Search, websearch: Globe, webfetch: Globe,
  task: Sparkles, notebookedit: FileText, mcp: Plug,
}

function ToolCard({ name }: { name: string }) {
  const lower = name.toLowerCase()
  let Icon = Wrench
  for (const [key, icon] of Object.entries(TOOL_ICONS)) {
    if (lower.includes(key)) { Icon = icon; break }
  }
  const isMcp = lower.startsWith('mcp__') || lower.startsWith('mcp_')
  const displayName = isMcp ? name.replace(/^mcp__[^_]+__/, '').replace(/^mcp_[^_]+_/, '') : name

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary border border-border rounded-lg hover:border-accent/30 transition-colors">
      <Icon size={14} className={isMcp ? 'text-tool-mcp' : 'text-accent'} />
      <span className="text-xs font-medium text-text-primary truncate">{displayName}</span>
      {isMcp && <span className="text-[9px] text-tool-mcp font-medium ml-auto shrink-0">MCP</span>}
    </div>
  )
}

function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <Icon size={36} className="mx-auto text-text-muted mb-3" />
      <p className="text-sm font-medium text-text-primary mb-1">{title}</p>
      <p className="text-xs text-text-muted max-w-sm mx-auto">{message}</p>
    </div>
  )
}

export function SkillsPage() {
  const { tools, mcpServers, skills, plugins, initialized, configLoaded, toggleMcpServer, toggleSkill, togglePlugin } = useCliSessionStore()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('mcp')
  const hasData = initialized || configLoaded

  const filteredServers = search
    ? mcpServers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.tools.some((t) => t.toLowerCase().includes(search.toLowerCase())))
    : mcpServers

  const filteredSkills = search
    ? skills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : skills

  const filteredPlugins = search
    ? plugins.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : plugins

  const coreTools = tools.filter((t) => !t.startsWith('mcp__') && !t.startsWith('mcp_'))
  const filteredTools = search
    ? coreTools.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : coreTools

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'mcp', label: 'MCP Servers', icon: Plug, count: mcpServers.length },
    { id: 'skills', label: 'Skills', icon: Sparkles, count: skills.length },
    { id: 'plugins', label: 'Plugins', icon: Puzzle, count: plugins.length },
    { id: 'tools', label: 'Tools', icon: Wrench, count: coreTools.length },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Skills & Integrations</h1>
            <p className="text-sm text-text-muted mt-1">
              {hasData
                ? `${mcpServers.length} MCP · ${skills.length} Skills · ${plugins.length} Plugins · ${coreTools.length} Tools`
                : 'Loading configuration from ~/.claude/...'}
            </p>
          </div>
          {!hasData && (
            <div className="flex items-center gap-2 text-xs text-text-muted bg-bg-secondary px-3 py-2 rounded-lg border border-border">
              <Loader2 size={14} className="animate-spin text-accent" />
              Loading config...
            </div>
          )}
          {hasData && !initialized && (
            <div className="flex items-center gap-2 text-xs text-text-muted bg-bg-secondary px-3 py-2 rounded-lg border border-border">
              <Info size={14} className="text-accent" />
              Config loaded · Send a message for full init
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex bg-bg-secondary rounded-lg p-0.5">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === id ? 'bg-btn-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={13} />
                {label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === id ? 'bg-white/20' : 'bg-bg-hover'
                  }`}>{count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        {/* MCP Servers */}
        {activeTab === 'mcp' && (
          <div>
            {!hasData && (
              <EmptyState icon={Plug} title="Loading MCP Servers..." message="Reading your ~/.claude/ configuration to find connected MCP servers." />
            )}
            {hasData && filteredServers.length === 0 && !search && (
              <EmptyState icon={Plug} title="No MCP Servers Connected" message="Configure MCP servers in ~/.claude/settings.json or through the Claude Code CLI." />
            )}
            {hasData && filteredServers.length === 0 && search && (
              <EmptyState icon={Search} title="No Results" message={`No MCP servers match "${search}"`} />
            )}
            <div className="space-y-2">
              {filteredServers.map((server) => (
                <McpServerCard key={server.name} server={server} onToggle={() => toggleMcpServer(server.name)} />
              ))}
            </div>
            {hasData && (
              <div className="mt-6 p-4 bg-bg-secondary/50 border border-border rounded-xl flex items-start gap-3">
                <Info size={16} className="text-accent mt-0.5 shrink-0" />
                <p className="text-xs text-text-muted leading-relaxed">
                  MCP servers are loaded from <span className="font-mono text-accent">~/.claude/</span> config.
                  {!initialized && ' Send a message to get full tool details for each server.'}
                  {' '}Toggle servers on/off above. To add or remove servers permanently, edit your Claude Code config.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <div>
            {!hasData && (
              <EmptyState icon={Sparkles} title="Loading Skills..." message="Reading skill configurations from ~/.claude/ directory." />
            )}
            {hasData && filteredSkills.length === 0 && !search && (
              <EmptyState icon={Sparkles} title="No Skills Configured" message="Agent skills are loaded from ~/.claude/skills/ and your project's .claude/skills/ directory. Create SKILL.md files to add custom skills." />
            )}
            {hasData && filteredSkills.length === 0 && search && (
              <EmptyState icon={Search} title="No Results" message={`No skills match "${search}"`} />
            )}
            <div className="space-y-2">
              {filteredSkills.map((skill) => (
                <SkillCard key={skill.name} skill={skill} onToggle={() => toggleSkill(skill.name)} />
              ))}
            </div>
            {hasData && (
              <div className="mt-6 p-4 bg-bg-secondary/50 border border-border rounded-xl flex items-start gap-3">
                <Info size={16} className="text-accent mt-0.5 shrink-0" />
                <div className="text-xs text-text-muted leading-relaxed">
                  <p className="mb-1">Skills are reusable instruction files that guide agent behavior.</p>
                  <p>Store them in <span className="font-mono text-accent">~/.claude/skills/</span> (global) or <span className="font-mono text-accent">.claude/skills/</span> (per-project).</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plugins */}
        {activeTab === 'plugins' && (
          <div>
            {!hasData && (
              <EmptyState icon={Puzzle} title="Loading Plugins..." message="Reading plugin configurations from ~/.claude/ directory." />
            )}
            {hasData && filteredPlugins.length === 0 && !search && (
              <EmptyState icon={Puzzle} title="No Plugins Installed" message="Plugins extend Claude Code's functionality. Configure them in your Claude Code settings." />
            )}
            {hasData && filteredPlugins.length === 0 && search && (
              <EmptyState icon={Search} title="No Results" message={`No plugins match "${search}"`} />
            )}
            <div className="space-y-2">
              {filteredPlugins.map((plugin) => (
                <PluginCard key={plugin.name} plugin={plugin} onToggle={() => togglePlugin(plugin.name)} />
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {activeTab === 'tools' && (
          <div>
            {!hasData && (
              <EmptyState icon={Wrench} title="Loading Tools..." message="Send a message in Chat to initialize the CLI session. Available tools will appear here." />
            )}
            {hasData && filteredTools.length === 0 && !search && (
              <EmptyState icon={Wrench} title="No Tools Data" message="Tools are loaded when the CLI initializes. Send a message in Chat to populate the tools list." />
            )}
            {hasData && filteredTools.length === 0 && search && (
              <EmptyState icon={Search} title="No Results" message={`No tools match "${search}"`} />
            )}
            {hasData && filteredTools.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool} name={tool} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
