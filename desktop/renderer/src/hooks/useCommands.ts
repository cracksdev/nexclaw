import { useCallback } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useNavigationStore } from '../stores/navigationStore'
import { useCliSessionStore } from '../stores/cliSessionStore'

export type CommandAction =
  | { type: 'handled' }
  | { type: 'open_settings' }
  | { type: 'send_prompt'; prompt: string }

interface CommandDef {
  command: string
  description: string
  category: 'session' | 'info' | 'navigation' | 'agent' | 'memory' | 'git' | 'advanced'
}

export const SLASH_COMMANDS: CommandDef[] = [
  // Session
  { command: '/help', description: 'Show available commands and usage', category: 'info' },
  { command: '/clear', description: 'Clear conversation history and free context', category: 'session' },
  { command: '/compact', description: 'Summarize conversation to reduce context', category: 'agent' },
  { command: '/status', description: 'Show session info, model, tools, etc.', category: 'info' },
  { command: '/cost', description: 'Show token usage and cost estimate', category: 'info' },
  { command: '/context', description: 'Show current context usage', category: 'info' },
  { command: '/files', description: 'List all files currently in context', category: 'info' },
  { command: '/rename', description: 'Rename the current conversation', category: 'session' },
  { command: '/resume', description: 'Resume a previous conversation', category: 'session' },
  { command: '/revision', description: 'Save or restore a conversation snapshot', category: 'session' },
  { command: '/export', description: 'Export conversation to file or clipboard', category: 'session' },

  // Model & Config
  { command: '/model', description: 'Show or switch the active AI model', category: 'navigation' },
  { command: '/config', description: 'Open settings / config panel', category: 'navigation' },
  { command: '/provider', description: 'Set up third-party provider profile', category: 'navigation' },
  { command: '/effort', description: 'Set effort level for model usage', category: 'navigation' },
  { command: '/permissions', description: 'Manage allow & deny tool permission rules', category: 'info' },

  // Integrations
  { command: '/mcp', description: 'Show MCP servers and go to Skills page', category: 'navigation' },
  { command: '/tools', description: 'List all available tools', category: 'info' },
  { command: '/skills', description: 'Go to Skills & MCP page', category: 'navigation' },
  { command: '/plugin', description: 'Manage Claude Code plugins', category: 'navigation' },

  // Agent
  { command: '/init', description: 'Create CLAUDE.md project memory file', category: 'agent' },
  { command: '/plan', description: 'Enter plan mode — analyze before changing', category: 'agent' },
  { command: '/review', description: 'Review recent code changes', category: 'agent' },
  { command: '/pr-comments', description: 'Get comments from a GitHub PR', category: 'agent' },

  // Memory & Project
  { command: '/memory', description: 'Edit Claude memory files (CLAUDE.md)', category: 'memory' },
  { command: '/add-dir', description: 'Add a new working directory', category: 'memory' },

  // Git
  { command: '/diff', description: 'View uncommitted changes and per-turn diffs', category: 'git' },
  { command: '/copy', description: 'Copy last response to clipboard', category: 'session' },

  // Diagnostics
  { command: '/doctor', description: 'Diagnose installation and connection', category: 'info' },
  { command: '/stats', description: 'Show usage statistics and activity', category: 'info' },
  { command: '/usage', description: 'Show plan usage limits', category: 'info' },

  // Auth
  { command: '/login', description: 'Show login / auth information', category: 'info' },
  { command: '/logout', description: 'Show logout instructions', category: 'info' },

  // Navigation (GUI-only)
  { command: '/dashboard', description: 'Go to Dashboard', category: 'navigation' },
  { command: '/tasks', description: 'Go to Task Board', category: 'navigation' },
  { command: '/chat', description: 'Go to Chat', category: 'navigation' },

  // Advanced
  { command: '/terminal-setup', description: 'Show shell integration setup info', category: 'advanced' },
  { command: '/keybindings', description: 'Open or create keybindings config', category: 'advanced' },
  { command: '/theme', description: 'Change the theme', category: 'advanced' },
  { command: '/vim', description: 'Toggle Vim editing mode', category: 'advanced' },
  { command: '/hooks', description: 'View hook configurations', category: 'advanced' },
  { command: '/sandbox', description: 'Toggle sandbox mode', category: 'advanced' },
  { command: '/feedback', description: 'Submit feedback about Claude Code', category: 'advanced' },
  { command: '/bug', description: 'Show how to report a bug', category: 'advanced' },
  { command: '/release-notes', description: 'View release notes', category: 'advanced' },
  { command: '/exit', description: 'Close the app', category: 'advanced' },
]

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function buildHelpText(): string {
  const sections: Record<string, CommandDef[]> = {}
  for (const cmd of SLASH_COMMANDS) {
    if (!sections[cmd.category]) sections[cmd.category] = []
    sections[cmd.category].push(cmd)
  }
  const labels: Record<string, string> = {
    session: 'Session',
    info: 'Information',
    navigation: 'Navigation',
    agent: 'Agent (sends prompt to Claude)',
    memory: 'Memory & Project',
    git: 'Git & Code',
    advanced: 'Advanced',
  }
  const order = ['session', 'info', 'navigation', 'agent', 'memory', 'git', 'advanced']
  const lines = ['## Available Commands\n']
  for (const cat of order) {
    const cmds = sections[cat]
    if (!cmds?.length) continue
    lines.push(`### ${labels[cat] || cat}\n`)
    for (const cmd of cmds) {
      lines.push(`\`${cmd.command}\` — ${cmd.description}`)
    }
    lines.push('')
  }
  lines.push('### Shortcuts\n')
  lines.push('`!command` — Prefix with ! to ask agent to run a shell command')
  lines.push('`Enter` — Send  |  `Shift+Enter` — New line  |  `Tab` — Autocomplete')
  return lines.join('\n')
}

export function useCommands() {
  const { addMessage, clearMessages, messages } = useChatStore()
  const { sessions, activeSessionId } = useSessionStore()
  const { provider, model, workingDirectory } = useSettingsStore()
  const { setPage } = useNavigationStore()
  const cliSession = useCliSessionStore()

  const systemMessage = useCallback((content: string) => {
    addMessage({
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: Date.now()
    })
  }, [addMessage])

  const executeCommand = useCallback((input: string): CommandAction => {
    const parts = input.trim().split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    switch (cmd) {
      // ─── Info ───
      case '/help': {
        systemMessage(buildHelpText())
        return { type: 'handled' }
      }

      case '/status': {
        const session = sessions.find((s) => s.id === activeSessionId)
        const lines = [
          '## Session Status\n',
          `**Session:** ${session?.title || 'None'}`,
          `**Provider:** ${provider}`,
          `**Model:** ${cliSession.activeModel || model}`,
          `**Working Directory:** \`${cliSession.cwd || workingDirectory || '(not set)'}\``,
          `**Permission Mode:** ${cliSession.permissionMode || 'default'}`,
          `**Messages:** ${messages.length}`,
          `**Session ID:** \`${cliSession.sessionId || activeSessionId || 'N/A'}\``,
          `**Claude Code:** ${cliSession.claudeCodeVersion || 'unknown'}`,
          `**API Key Source:** ${cliSession.apiKeySource || 'unknown'}`,
          `**MCP Servers:** ${cliSession.mcpServers.length} connected`,
          `**Tools:** ${cliSession.tools.length} available`,
          `**Skills:** ${cliSession.skills.length} loaded`,
          `**Plugins:** ${cliSession.plugins.length} installed`,
        ]
        systemMessage(lines.join('\n'))
        return { type: 'handled' }
      }

      case '/cost': {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
        const estimatedTokens = Math.ceil(totalChars / 4)
        const estimatedCost = (estimatedTokens / 1000000 * 3).toFixed(4)
        systemMessage([
          '## Token Usage Estimate\n',
          `**Messages:** ${messages.length}`,
          `**Total Characters:** ${totalChars.toLocaleString()}`,
          `**Estimated Tokens:** ~${estimatedTokens.toLocaleString()}`,
          `**Estimated Cost:** ~$${estimatedCost}`,
          '',
          '*Rough estimate based on character count. Actual usage may differ.*',
        ].join('\n'))
        return { type: 'handled' }
      }

      case '/context': {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
        const estimatedTokens = Math.ceil(totalChars / 4)
        const maxTokens = 200000
        const pct = Math.min(100, (estimatedTokens / maxTokens) * 100).toFixed(1)
        const barLen = 30
        const filled = Math.round((estimatedTokens / maxTokens) * barLen)
        const bar = '█'.repeat(Math.min(filled, barLen)) + '░'.repeat(Math.max(0, barLen - filled))
        systemMessage([
          '## Context Usage\n',
          `\`[${bar}]\` ${pct}%`,
          '',
          `**Tokens used:** ~${estimatedTokens.toLocaleString()} / ${maxTokens.toLocaleString()}`,
          `**Messages:** ${messages.length}`,
          '',
          'Use `/compact` to summarize and reduce context, or `/clear` to start fresh.',
        ].join('\n'))
        return { type: 'handled' }
      }

      case '/files': {
        if (cliSession.tools.length === 0) {
          systemMessage('## Files in Context\n\nNo file tracking available. Send a message first to initialize the CLI session.')
        } else {
          systemMessage('## Files in Context\n\nFile tracking requires an active CLI session. The agent tracks files it has read or written during the conversation.')
        }
        return { type: 'handled' }
      }

      case '/tools': {
        if (cliSession.tools.length === 0) {
          systemMessage('## Tools\n\nNo tools loaded yet. Send a message first to initialize the CLI session.')
        } else {
          const core = cliSession.tools.filter((t) => !t.startsWith('mcp__') && !t.startsWith('mcp_'))
          const mcp = cliSession.tools.filter((t) => t.startsWith('mcp__') || t.startsWith('mcp_'))
          const lines = [`## Available Tools (${cliSession.tools.length})\n`]
          if (core.length) {
            lines.push(`### Core Tools (${core.length})\n`)
            lines.push(core.map((t) => `\`${t}\``).join(', '))
            lines.push('')
          }
          if (mcp.length) {
            lines.push(`### MCP Tools (${mcp.length})\n`)
            lines.push(mcp.map((t) => `\`${t}\``).join(', '))
          }
          systemMessage(lines.join('\n'))
        }
        return { type: 'handled' }
      }

      case '/permissions': {
        systemMessage(`## Permissions\n\n**Mode:** ${cliSession.permissionMode || 'default'}\n\nTool permissions are managed by the Claude Code CLI. When a tool requires approval, a permission dialog will appear in the chat.\n\nManage in \`~/.claude/settings.json\` or run \`/permissions\` in the CLI.`)
        return { type: 'handled' }
      }

      case '/doctor': {
        const checks = [
          '## Health Check\n',
          `${cliSession.initialized ? '✅' : cliSession.configLoaded ? '🔶' : '❌'} **CLI Connection:** ${cliSession.initialized ? 'Connected' : cliSession.configLoaded ? 'Config loaded, awaiting CLI init' : 'Not initialized'}`,
          `${cliSession.activeModel ? '✅' : '⬜'} **Model:** ${cliSession.activeModel || model || 'Not set'}`,
          `${cliSession.cwd || workingDirectory ? '✅' : '⬜'} **Working Directory:** ${cliSession.cwd || workingDirectory ? `\`${cliSession.cwd || workingDirectory}\`` : 'Not set'}`,
          `${cliSession.apiKeySource ? '✅' : '⬜'} **Auth:** ${cliSession.apiKeySource || 'Using ~/.claude/ credentials'}`,
          `${cliSession.mcpServers.length > 0 ? '✅' : '⬜'} **MCP Servers:** ${cliSession.mcpServers.length} found`,
          `${cliSession.tools.length > 0 ? '✅' : '⬜'} **Tools:** ${cliSession.tools.length} available`,
          `${cliSession.skills.length > 0 ? '✅' : '⬜'} **Skills:** ${cliSession.skills.length} loaded`,
          `${cliSession.plugins.length > 0 ? '✅' : '⬜'} **Plugins:** ${cliSession.plugins.length} installed`,
          `⬜ **Claude Code Version:** ${cliSession.claudeCodeVersion || 'unknown'}`,
        ]
        systemMessage(checks.join('\n'))
        return { type: 'handled' }
      }

      case '/stats': {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
        const userMsgs = messages.filter((m) => m.role === 'user')
        const assistMsgs = messages.filter((m) => m.role === 'assistant')
        const sysMsgs = messages.filter((m) => m.role === 'system')
        systemMessage([
          '## Session Statistics\n',
          `**Total messages:** ${messages.length}`,
          `**User messages:** ${userMsgs.length}`,
          `**Assistant messages:** ${assistMsgs.length}`,
          `**System messages:** ${sysMsgs.length}`,
          `**Total characters:** ${totalChars.toLocaleString()}`,
          `**MCP Servers:** ${cliSession.mcpServers.length}`,
          `**Available tools:** ${cliSession.tools.length}`,
          `**Loaded skills:** ${cliSession.skills.length}`,
          `**Installed plugins:** ${cliSession.plugins.length}`,
        ].join('\n'))
        return { type: 'handled' }
      }

      case '/usage': {
        systemMessage('## Plan Usage\n\nUsage tracking depends on your Anthropic account tier.\n\nCheck your usage at [console.anthropic.com](https://console.anthropic.com/) or run `/usage` in the CLI for detailed limits.')
        return { type: 'handled' }
      }

      // ─── Session ───
      case '/clear': {
        clearMessages()
        systemMessage('Conversation cleared.')
        return { type: 'handled' }
      }

      case '/rename': {
        if (args) {
          const currentSessionId = useSessionStore.getState().activeSessionId
          if (currentSessionId) {
            useSessionStore.getState().setSessionProject(currentSessionId, args)
            systemMessage(`Session renamed to **${args}**`)
          }
        } else {
          systemMessage('Usage: `/rename <new name>`')
        }
        return { type: 'handled' }
      }

      case '/resume': {
        const resumeSessions = sessions
          .filter((s) => s.messageCount > 0)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 15)

        if (resumeSessions.length === 0) {
          systemMessage('## Resume\n\nNo previous sessions to resume. Start a conversation first.')
        } else {
          const lines = ['## Resume a Previous Conversation\n']
          lines.push('Select a session from the sidebar to resume it.\n')
          for (let i = 0; i < resumeSessions.length; i++) {
            const s = resumeSessions[i]
            const ago = formatRelativeTime(s.updatedAt)
            const folder = s.projectFolder ? ` 📁 ${s.projectFolder}` : ''
            lines.push(`**${i + 1}.** ${s.title}${folder}`)
            lines.push(`   ${s.messageCount} messages · ${ago}`)
            if (s.preview) lines.push(`   *${s.preview.substring(0, 80)}*`)
            lines.push('')
          }
          systemMessage(lines.join('\n'))
        }
        return { type: 'handled' }
      }

      case '/revision': {
        const subCmd = args.split(/\s+/)[0]?.toLowerCase()
        if (subCmd === 'save' || !subCmd) {
          const label = args.replace(/^save\s*/i, '').trim()
          useSessionStore.getState().createRevision(label || undefined)
          systemMessage(`📌 **Revision saved.** ${label ? `Label: "${label}"` : 'Snapshot of current conversation state.'}`)
        } else if (subCmd === 'list') {
          const sid = useSessionStore.getState().activeSessionId
          const revs = sid ? useSessionStore.getState().getSessionRevisions(sid) : []
          if (revs.length === 0) {
            systemMessage('## Revisions\n\nNo revisions saved for this session. Use `/revision save` to create one.')
          } else {
            const lines = ['## Saved Revisions\n']
            for (const r of revs) {
              lines.push(`- **${r.label}** — ${r.messages.length} messages · ${formatRelativeTime(r.timestamp)}`)
            }
            lines.push('\nRestore from the **Revisions** tab in the sidebar.')
            systemMessage(lines.join('\n'))
          }
        } else {
          systemMessage('## Revision Commands\n\n`/revision` or `/revision save` — Save current state\n`/revision save <label>` — Save with a custom label\n`/revision list` — List saved revisions\n\nRestore revisions from the sidebar **Revisions** tab.')
        }
        return { type: 'handled' }
      }

      case '/export': {
        const content = messages
          .map((m) => `[${m.role}] ${m.content}`)
          .join('\n\n---\n\n')
        navigator.clipboard.writeText(content).then(() => {
          systemMessage(`Exported ${messages.length} messages to clipboard.`)
        }).catch(() => {
          systemMessage('Failed to copy to clipboard.')
        })
        return { type: 'handled' }
      }

      case '/copy': {
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
        if (lastAssistant) {
          navigator.clipboard.writeText(lastAssistant.content).then(() => {
            systemMessage('Last response copied to clipboard.')
          }).catch(() => {
            systemMessage('Failed to copy to clipboard.')
          })
        } else {
          systemMessage('No assistant response to copy.')
        }
        return { type: 'handled' }
      }

      // ─── Navigation ───
      case '/model': {
        systemMessage(`**Current model:** ${cliSession.activeModel || model}\n**Provider:** ${provider}\n\nOpening Settings to change model...`)
        return { type: 'open_settings' }
      }

      case '/config': {
        return { type: 'open_settings' }
      }

      case '/provider': {
        systemMessage('Opening Settings to configure provider...')
        return { type: 'open_settings' }
      }

      case '/effort': {
        systemMessage('## Effort Level\n\nEffort level controls how thoroughly the model processes requests.\n\nThis is configured in Settings or through the CLI with `/effort`.')
        return { type: 'open_settings' }
      }

      case '/mcp': {
        if (cliSession.mcpServers.length === 0) {
          systemMessage('## MCP Servers\n\nNo MCP servers found. Check your `~/.claude/` configuration or the **Skills** page.')
        } else {
          const lines = ['## MCP Servers\n']
          for (const s of cliSession.mcpServers) {
            const status = s.enabled ? '🟢' : '⚫'
            const toolCount = s.tools?.length ? ` (${s.tools.length} tools)` : ''
            lines.push(`${status} **${s.name}**${toolCount}`)
          }
          lines.push('\nManage servers on the **Skills** page.')
          systemMessage(lines.join('\n'))
        }
        setPage('skills')
        return { type: 'handled' }
      }

      case '/skills': {
        setPage('skills')
        return { type: 'handled' }
      }

      case '/plugin':
      case '/plugins':
      case '/marketplace': {
        if (cliSession.plugins.length === 0) {
          systemMessage('## Plugins\n\nNo plugins installed. Manage plugins on the **Skills** page or through the CLI with `/plugin`.')
        } else {
          const lines = ['## Installed Plugins\n']
          for (const p of cliSession.plugins) {
            const status = p.enabled ? '🟢' : '⚫'
            lines.push(`${status} **${p.name}**`)
          }
          systemMessage(lines.join('\n'))
        }
        setPage('skills')
        return { type: 'handled' }
      }

      case '/dashboard': {
        setPage('dashboard')
        return { type: 'handled' }
      }

      case '/tasks': {
        setPage('tasks')
        return { type: 'handled' }
      }

      case '/chat': {
        setPage('chat')
        return { type: 'handled' }
      }

      // ─── Agent (sends to CLI) ───
      case '/compact': {
        systemMessage('**Compacting...** Asking the agent to summarize the conversation so far to reduce context size.')
        return { type: 'send_prompt', prompt: 'Please compact and summarize our conversation so far to reduce context size.' }
      }

      case '/init': {
        systemMessage('**Initializing...** Asking the agent to create a CLAUDE.md project memory file.')
        return { type: 'send_prompt', prompt: 'Please create a CLAUDE.md project memory file for this project with key architectural decisions, conventions, and useful context.' }
      }

      case '/plan': {
        systemMessage('**Plan mode:** Asking the agent to analyze and plan before making changes.')
        return { type: 'send_prompt', prompt: 'Please enter plan mode. Analyze the current state and outline an approach before making any changes.' }
      }

      case '/review': {
        systemMessage('**Reviewing...** Asking the agent to review recent code changes.')
        return { type: 'send_prompt', prompt: 'Please review the recent code changes in this project. Look for bugs, issues, and improvements.' }
      }

      case '/pr-comments': {
        if (args) {
          systemMessage(`**Fetching PR comments** from: ${args}`)
          return { type: 'send_prompt', prompt: `Please get comments from this GitHub pull request: ${args}` }
        }
        systemMessage('Usage: `/pr-comments <pr-url-or-number>`')
        return { type: 'handled' }
      }

      case '/diff': {
        systemMessage('**Checking diffs...** Asking the agent to show uncommitted changes.')
        return { type: 'send_prompt', prompt: 'Please show the uncommitted changes and recent diffs in this project.' }
      }

      // ─── Memory ───
      case '/memory': {
        systemMessage('## Memory Files\n\nClaude memory is stored in `CLAUDE.md` files:\n\n- **Project:** `./CLAUDE.md` in your working directory\n- **Global:** `~/.claude/CLAUDE.md`\n\nUse `/init` to create one, or edit them directly.')
        return { type: 'handled' }
      }

      case '/add-dir': {
        systemMessage('## Add Directory\n\nUse the folder picker in Settings to add a new working directory, or run `/add-dir` in the CLI.')
        return { type: 'open_settings' }
      }

      // ─── Auth ───
      case '/login': {
        systemMessage(`## Authentication\n\n**Current source:** ${cliSession.apiKeySource || 'Using ~/.claude/ credentials'}\n\nNexClaw uses your existing Claude Code credentials from \`~/.claude/\`.\n\nTo switch accounts:\n1. Open a terminal\n2. Run \`nexclaw /login\`\n3. Follow the OAuth flow\n4. Restart the desktop app`)
        return { type: 'handled' }
      }

      case '/logout': {
        systemMessage('## Logout\n\nTo sign out of your Anthropic account:\n\n1. Open a terminal\n2. Run `nexclaw /logout`\n3. Your credentials in `~/.claude/` will be cleared\n4. Restart the desktop app')
        return { type: 'handled' }
      }

      // ─── Advanced ───
      case '/terminal-setup': {
        systemMessage('## Terminal / Shell Setup\n\nShell integration is handled by Claude Code CLI. To set up:\n\n1. Run `nexclaw` in your terminal\n2. The CLI will auto-detect your shell (bash, zsh, fish, PowerShell)\n3. Shell history and environment are available to the agent\n\nFor manual setup, see the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code).')
        return { type: 'handled' }
      }

      case '/keybindings': {
        systemMessage('## Keybindings\n\n| Shortcut | Action |\n|----------|--------|\n| `Enter` | Send message |\n| `Shift+Enter` | New line |\n| `Tab` | Autocomplete command |\n| `/` | Start slash command |\n| `!` | Start shell command |\n| `Esc` | Cancel current stream |\n\nCustomize keybindings via Claude Code CLI with `/keybindings`.')
        return { type: 'handled' }
      }

      case '/theme': {
        systemMessage('## Theme\n\nTheme can be changed in Settings. Currently using the NexClaw light theme with Claude orange accent.\n\nOpening Settings...')
        return { type: 'open_settings' }
      }

      case '/vim': {
        systemMessage('## Vim Mode\n\nVim editing mode is a CLI-only feature. Run `/vim` in the Claude Code CLI to toggle it.')
        return { type: 'handled' }
      }

      case '/hooks': {
        systemMessage('## Hooks\n\nHooks are configured in `~/.claude/settings.json` under the `hooks` key.\n\nSupported hook events:\n- **SessionStart** — Run on session start\n- **PostToolUse** — Run after each tool use\n\nEdit your `~/.claude/settings.json` to configure hooks.')
        return { type: 'handled' }
      }

      case '/sandbox': {
        systemMessage('## Sandbox Mode\n\nSandbox mode restricts the agent\'s ability to execute commands.\n\nToggle sandbox mode in Settings or through the CLI with `/sandbox`.')
        return { type: 'handled' }
      }

      case '/feedback': {
        systemMessage('## Feedback\n\nWe appreciate your feedback!\n\n1. Go to [github.com/anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues)\n2. Open a new issue with the "feedback" label\n3. Describe your experience, feature requests, or suggestions')
        return { type: 'handled' }
      }

      case '/bug': {
        systemMessage('## Report a Bug\n\nTo report a bug:\n\n1. Go to [github.com/anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues)\n2. Include your session ID: `' + (cliSession.sessionId || 'N/A') + '`\n3. Include the CLI version: `' + (cliSession.claudeCodeVersion || 'unknown') + '`\n4. Describe the steps to reproduce')
        return { type: 'handled' }
      }

      case '/release-notes': {
        systemMessage('## Release Notes\n\nView the latest release notes at:\n[github.com/anthropics/claude-code/releases](https://github.com/anthropics/claude-code/releases)\n\nCurrent version: `' + (cliSession.claudeCodeVersion || 'unknown') + '`')
        return { type: 'handled' }
      }

      case '/exit': {
        window.nexClaw?.window?.close()
        return { type: 'handled' }
      }

      default: {
        systemMessage(`Unknown command: \`${cmd}\`\n\nType \`/help\` to see available commands.`)
        return { type: 'handled' }
      }
    }
  }, [systemMessage, clearMessages, messages, sessions, activeSessionId, provider, model, workingDirectory, setPage, cliSession])

  return { executeCommand, SLASH_COMMANDS }
}
