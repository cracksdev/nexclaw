import { spawn, execSync, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync, readdirSync } from 'fs'
import { homedir, userInfo } from 'os'
import { join } from 'path'
import { app } from 'electron'

/**
 * On macOS, packaged Electron apps launch with a minimal PATH that doesn't
 * include Homebrew, nvm, or any user-installed Node. We resolve the binary
 * explicitly so the CLI subprocess can actually start.
 */
function resolveNodeBinary(): string {
  // 1. Try shell `which` — works if the GUI app was launched from a terminal
  try {
    const found = execSync('which node', { encoding: 'utf8', timeout: 2000 }).trim()
    if (found && existsSync(found)) return found
  } catch { /* ignore */ }

  // 2. Check well-known macOS install paths (Homebrew arm64/x64, nvm default, system)
  const candidates: string[] = [
    '/opt/homebrew/bin/node',           // Homebrew Apple Silicon
    '/usr/local/bin/node',              // Homebrew Intel / manual install
    '/opt/homebrew/opt/node/bin/node',  // Homebrew via formula
  ]
  const home = process.env.HOME
  if (home) {
    const nvmVersionsDir = join(home, '.nvm', 'versions', 'node')
    if (existsSync(nvmVersionsDir)) {
      try {
        const versions = readdirSync(nvmVersionsDir).filter((d) => d.startsWith('v'))
        versions.sort((a, b) => {
          const pa = a.slice(1).split('.').map((n) => parseInt(n, 10) || 0)
          const pb = b.slice(1).split('.').map((n) => parseInt(n, 10) || 0)
          const len = Math.max(pa.length, pb.length)
          for (let i = 0; i < len; i++) {
            const na = pa[i] ?? 0
            const nb = pb[i] ?? 0
            if (na !== nb) return na - nb
          }
          return 0
        })
        const latest = versions.at(-1)
        if (latest) {
          const nvmNode = join(nvmVersionsDir, latest, 'bin', 'node')
          if (existsSync(nvmNode)) candidates.push(nvmNode)
        }
      } catch { /* ignore unreadable dir */ }
    }
  }
  candidates.push('/usr/bin/node')
  for (const p of candidates) {
    if (existsSync(p)) return p
  }

  // 3. Fallback — let the OS try (will fail on Mac if PATH is stripped, but we've tried our best)
  return 'node'
}

export type ToolPermissionOutcome = 'once' | 'always' | 'no'

export interface CliCommand {
  type: 'send_message' | 'cancel' | 'tool_response' | 'set_config'
  id?: string
  content?: string
  /** Resolved tool permission answer for stdin control_response */
  permissionOutcome?: ToolPermissionOutcome
  key?: string
  value?: string
}

export interface CliEvent {
  event: string
  [key: string]: unknown
}

function dbg(tag: string, ...args: unknown[]): void {
  console.log(`[CLI:${tag}]`, ...args)
}

/** Env presence for auth debugging — never logs secret values, only lengths / absent. */
function envCredentialFlag(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name]
  if (v === undefined) return 'absent'
  const t = String(v).trim()
  if (!t) return 'empty'
  return `set(len=${t.length})`
}

function buildAuthEnvSummary(
  providerEnv: Record<string, string>,
  childEnv: NodeJS.ProcessEnv,
): Record<string, unknown> {
  const path = childEnv.PATH ?? ''
  const configHome =
    childEnv.CLAUDE_CONFIG_DIR ?? join(childEnv.HOME ?? homedir(), '.claude')
  const credentialsJson = join(configHome, '.credentials.json')
  return {
    platform: process.platform,
    home: childEnv.HOME ?? null,
    user: childEnv.USER ?? null,
    logname: childEnv.LOGNAME ?? null,
    pathIncludesUsrBin: path.includes('/usr/bin'),
    pathPrefix: path.split(':').slice(0, 5).join(':'),
    claudeConfigDir:
      childEnv.CLAUDE_CONFIG_DIR ?? '(unset; CLI uses homedir()/.claude)',
    credentialsJsonPath: credentialsJson,
    credentialsJsonExists: existsSync(credentialsJson),
    providerUiKeys: Object.keys(providerEnv),
    ANTHROPIC_API_KEY: envCredentialFlag(childEnv, 'ANTHROPIC_API_KEY'),
    ANTHROPIC_AUTH_TOKEN: envCredentialFlag(childEnv, 'ANTHROPIC_AUTH_TOKEN'),
    CLAUDE_CODE_OAUTH_TOKEN: envCredentialFlag(childEnv, 'CLAUDE_CODE_OAUTH_TOKEN'),
    NODE_OPTIONS: envCredentialFlag(childEnv, 'NODE_OPTIONS'),
    nexclawAuthDebug:
      ['1', 'true', 'yes'].includes(
        (process.env['NEXCLAW_AUTH_DEBUG'] ?? '').toLowerCase().trim(),
      ) || false,
  }
}

export interface ProviderConfig {
  provider: string
  model: string
  apiKey: string
  baseUrl: string
}

export class CliManager extends EventEmitter {
  private process: ChildProcess | null = null
  private buffer = ''
  private sessionId: string | null = null
  private workingDir: string = process.cwd()
  private conversationId: string | null = null
  /** request_id → metadata for building control_response */
  private pendingPermissionMeta = new Map<
    string,
    { toolUseId: string; suggestions?: unknown[] }
  >()
  /** Open stdin keeps stream-json CLI alive forever; we end it after the turn `result`. */
  private stdinEnded = false
  private messageCompleteEmitted = false
  /** When true, spawns Claude with `--dangerously-skip-permissions` (no tool prompts). */
  private dangerouslySkipPermissions = false
  /** Provider config from UI settings — translated to env vars at spawn time. */
  private providerConfig: ProviderConfig | null = null

  getCliPath(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, 'cli', 'cli.mjs')
    }
    return join(__dirname, '../../../dist/cli.mjs')
  }

  isRunning(): boolean {
    return this.process !== null && this.process.exitCode === null
  }

  getDangerouslySkipPermissions(): boolean {
    return this.dangerouslySkipPermissions
  }

  /**
   * Enable or disable auto-approval mode. Enabling kills any in-flight CLI run so the next
   * message is spawned with `--dangerously-skip-permissions`.
   */
  setProviderConfig(config: ProviderConfig): void {
    this.providerConfig = config
    dbg('setProviderConfig', 'provider=', config.provider, 'model=', config.model)
  }

  private buildProviderEnv(): Record<string, string> {
    const cfg = this.providerConfig
    if (!cfg || !cfg.provider || cfg.provider === 'anthropic') {
      // Default: Anthropic — only pass key if non-empty after trim (else CLI uses ~/.claude/)
      const k = cfg?.apiKey?.trim()
      if (k) return { ANTHROPIC_API_KEY: k }
      return {}
    }

    const key = cfg.apiKey?.trim()
    const env: Record<string, string> = {}

    if (cfg.provider === 'openai') {
      env.CLAUDE_CODE_USE_OPENAI = '1'
      if (key) env.OPENAI_API_KEY = key
      if (cfg.model) env.OPENAI_MODEL = cfg.model
      env.OPENAI_BASE_URL = cfg.baseUrl || 'https://api.openai.com/v1'
    } else if (cfg.provider === 'gemini') {
      env.CLAUDE_CODE_USE_GEMINI = '1'
      if (key) env.GEMINI_API_KEY = key
      if (cfg.model) env.GEMINI_MODEL = cfg.model
      if (cfg.baseUrl) env.GEMINI_BASE_URL = cfg.baseUrl
    } else if (cfg.provider === 'ollama') {
      env.CLAUDE_CODE_USE_OPENAI = '1'
      env.OPENAI_BASE_URL = cfg.baseUrl || 'http://localhost:11434/v1'
      if (cfg.model) env.OPENAI_MODEL = cfg.model
      env.OPENAI_API_KEY = 'ollama'
    } else if (cfg.provider === 'deepseek') {
      env.CLAUDE_CODE_USE_OPENAI = '1'
      if (key) env.OPENAI_API_KEY = key
      if (cfg.model) env.OPENAI_MODEL = cfg.model
      env.OPENAI_BASE_URL = cfg.baseUrl || 'https://api.deepseek.com/v1'
    } else if (cfg.provider === 'github') {
      env.CLAUDE_CODE_USE_GITHUB = '1'
      if (key) env.GITHUB_TOKEN = key
      if (cfg.model) env.OPENAI_MODEL = cfg.model
      if (cfg.baseUrl) env.OPENAI_BASE_URL = cfg.baseUrl
    } else if (cfg.provider === 'codex') {
      env.CLAUDE_CODE_USE_OPENAI = '1'
      if (key) env.CODEX_API_KEY = key
      if (cfg.model) env.OPENAI_MODEL = cfg.model
      if (cfg.baseUrl) env.OPENAI_BASE_URL = cfg.baseUrl
    } else {
      // Generic OpenAI-compatible fallback
      env.CLAUDE_CODE_USE_OPENAI = '1'
      if (key) env.OPENAI_API_KEY = key
      if (cfg.model) env.OPENAI_MODEL = cfg.model
      if (cfg.baseUrl) env.OPENAI_BASE_URL = cfg.baseUrl
    }

    return env
  }

  /**
   * macOS GUI apps inherit a sparse `process.env` (no shell profile). Empty
   * `ANTHROPIC_API_KEY=` etc. still get forwarded and make Anthropic return 401;
   * stripping them lets the CLI fall back to OAuth / ~/.claude/.
   *
   * Claude Code stores OAuth in the macOS Keychain under `security -a "$USER"`.
   * If USER/HOME differ from Terminal (where /login ran), keychain read fails,
   * tokens are missing, and the API sees invalid auth → 401. We align USER,
   * LOGNAME, HOME, and PATH with the real login user so keychain + ~/.claude
   * match `claude` in Terminal.
   */
  private buildCliChildEnv(providerEnv: Record<string, string>): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...providerEnv,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    }

    const home = homedir()
    if (process.platform === 'darwin') {
      env.HOME = home
      try {
        const u = userInfo().username
        env.USER = u
        env.LOGNAME = u
      } catch {
        /* ignore */
      }
      const sysPaths = '/usr/bin:/bin:/usr/sbin:/sbin'
      const p = env.PATH ?? ''
      if (!p.includes('/usr/bin')) {
        env.PATH = p ? `${sysPaths}:${p}` : sysPaths
      }
    } else {
      if (!env.HOME?.trim()) {
        env.HOME = home
      }
      if (process.platform === 'win32' && !env.USERPROFILE?.trim()) {
        env.USERPROFILE = home
      }
    }

    const stripIfEmpty = [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'GITHUB_TOKEN',
      'CODEX_API_KEY',
    ] as const
    for (const name of stripIfEmpty) {
      const v = env[name]
      if (v !== undefined && String(v).trim() === '') {
        delete env[name]
      }
    }

    const authDbg = process.env['NEXCLAW_AUTH_DEBUG']?.toLowerCase().trim()
    if (authDbg === '1' || authDbg === 'true' || authDbg === 'yes') {
      env.CLAUDE_CODE_DEBUG_LOG_LEVEL = 'verbose'
    }

    return env
  }

  setDangerouslySkipPermissions(enabled: boolean): void {
    this.dangerouslySkipPermissions = enabled
    dbg('setDangerouslySkipPermissions', enabled)
    if (enabled && this.isRunning()) {
      dbg('setDangerouslySkipPermissions', 'canceling current process for flag change')
      this.cancelCurrent()
    }
    if (enabled) {
      this.pendingPermissionMeta.clear()
    }
  }

  async start(workingDirectory?: string): Promise<boolean> {
    if (workingDirectory) {
      this.workingDir = workingDirectory
    }
    dbg('start', 'workingDir=', this.workingDir)
    this.emit('status', { running: true })
    this.emit('event', { event: 'ready', version: '0.1.0' })
    return true
  }

  send(command: CliCommand): void {
    dbg('send', 'command=', JSON.stringify(command))
    switch (command.type) {
      case 'send_message':
        if (command.content) {
          this.runPrompt(command.content)
        } else {
          dbg('send', 'WARN: send_message with no content')
        }
        break
      case 'cancel':
        this.cancelCurrent()
        break
      case 'tool_response':
        this.sendPermissionControlResponse(command)
        break
      default:
        break
    }
  }

  private writeStdinJson(message: Record<string, unknown>): void {
    if (!this.process?.stdin?.writable) {
      dbg('writeStdinJson', 'skip: no writable stdin')
      return
    }
    const line = `${JSON.stringify(message)}\n`
    const ok = this.process.stdin.write(line, 'utf8')
    if (!ok) {
      this.process.stdin.once('drain', () => dbg('stdin', 'drained'))
    }
  }

  private sendPermissionControlResponse(command: CliCommand): void {
    const requestId = command.id
    const outcome = command.permissionOutcome
    if (!requestId || !outcome) {
      dbg('tool_response', 'skip: missing id or permissionOutcome')
      return
    }
    const meta = this.pendingPermissionMeta.get(requestId)
    const toolUseId = meta?.toolUseId ?? ''
    const suggestions = meta?.suggestions

    let inner: Record<string, unknown>
    if (outcome === 'no') {
      inner = {
        behavior: 'deny',
        message: 'User denied tool permission',
        toolUseID: toolUseId,
        decisionClassification: 'user_reject',
      }
    } else {
      inner = {
        behavior: 'allow',
        updatedInput: {},
        toolUseID: toolUseId,
        decisionClassification:
          outcome === 'always' ? 'user_permanent' : 'user_temporary',
      }
      if (
        outcome === 'always' &&
        Array.isArray(suggestions) &&
        suggestions.length > 0
      ) {
        inner.updatedPermissions = suggestions
      }
    }

    this.writeStdinJson({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: requestId,
        response: inner,
      },
    })
    this.pendingPermissionMeta.delete(requestId)
  }

  private runPrompt(prompt: string): void {
    dbg('runPrompt', 'prompt=', prompt.substring(0, 100))

    if (this.isRunning()) {
      dbg('runPrompt', 'killing previous process first')
      this.cancelCurrent()
    }

    this.pendingPermissionMeta.clear()
    this.stdinEnded = false
    this.messageCompleteEmitted = false

    const cliPath = this.getCliPath()
    const args = [
      cliPath,
      '--print',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-prompt-tool',
      'stdio',
    ]

    if (this.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions')
    }

    if (this.conversationId) {
      args.push('--resume', this.conversationId)
    }

    dbg('spawn', 'node', args.join(' '))
    dbg('spawn', 'cwd=', this.workingDir)
    dbg('spawn', 'cliPath exists?', existsSync(cliPath))

    this.buffer = ''

    const msgId = crypto.randomUUID()
    dbg('spawn', 'msgId=', msgId)
    this.emit('event', { event: 'message_start', id: msgId })

    try {
      const providerEnv = this.buildProviderEnv()
      dbg('spawn', 'providerEnv keys=', Object.keys(providerEnv).join(','))

      const nodeBin = resolveNodeBinary()
      dbg('spawn', 'nodeBin=', nodeBin)
      const childEnv = this.buildCliChildEnv(providerEnv)
      const authSummary = buildAuthEnvSummary(providerEnv, childEnv)
      dbg('spawn-auth', authSummary)
      this.emit('event', {
        event: 'nexclaw_spawn_auth',
        summary: authSummary,
      })

      this.process = spawn(nodeBin, args, {
        cwd: this.workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: childEnv,
      })

      dbg('spawn', 'pid=', this.process.pid)

      this.writeStdinJson({
        type: 'user',
        session_id: '',
        message: { role: 'user', content: prompt },
        parent_tool_use_id: null,
      })

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        dbg('stdout', `(${text.length} chars)`, text.substring(0, 500))
        this.handleStdout(text, msgId)
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim()
        if (msg) {
          dbg('stderr', msg.substring(0, 500))
          this.emit('event', { event: 'log', level: 'stderr', message: msg })
        }
      })

      this.process.on('exit', (code, signal) => {
        dbg('exit', 'code=', code, 'signal=', signal)
        this.pendingPermissionMeta.clear()
        this.process = null
        this.emitMessageCompleteIfNeeded(msgId, code)
      })

      this.process.on('error', (err) => {
        dbg('error', 'process error:', err.message)
        this.endChildStdin()
        this.emit('event', {
          event: 'error',
          message: `CLI process error: ${err.message}`
        })
        this.emitMessageCompleteIfNeeded(msgId, -1)
        this.process = null
      })
    } catch (err) {
      dbg('error', 'spawn failed:', err instanceof Error ? err.message : String(err))
      this.emit('event', {
        event: 'error',
        message: `Failed to start CLI: ${err instanceof Error ? err.message : String(err)}`
      })
      this.emitMessageCompleteIfNeeded(msgId, -1)
    }
  }

  private endChildStdin(): void {
    if (this.stdinEnded) return
    const proc = this.process
    if (!proc?.stdin) return
    try {
      if (!proc.stdin.destroyed && proc.stdin.writable) {
        proc.stdin.end()
      }
    } catch (e) {
      dbg('endChildStdin', e instanceof Error ? e.message : String(e))
    }
    this.stdinEnded = true
  }

  private emitMessageCompleteIfNeeded(
    msgId: string,
    exitCode: number | null | undefined,
  ): void {
    if (this.messageCompleteEmitted) return
    this.messageCompleteEmitted = true
    this.emit('event', {
      event: 'message_complete',
      id: msgId,
      exitCode: exitCode ?? null,
    })
  }

  private cancelCurrent(): void {
    if (this.process && this.process.exitCode === null) {
      dbg('cancel', 'killing pid=', this.process.pid)
      this.process.kill('SIGTERM')
      setTimeout(() => {
        if (this.process && this.process.exitCode === null) {
          this.process.kill('SIGKILL')
        }
      }, 3000)
    }
  }

  stop(): void {
    dbg('stop', 'stopping CLI')
    this.cancelCurrent()
    this.emit('status', { running: false })
  }

  private handleStdout(data: string, currentMsgId: string): void {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    dbg('handleStdout', `${lines.length} complete line(s), buffer remainder=${this.buffer.length} chars`)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const msg = JSON.parse(trimmed)
        dbg('parsed', 'type=', msg.type, 'keys=', Object.keys(msg).join(','))
        this.handleStreamJsonMessage(msg, currentMsgId)
      } catch {
        dbg('non-json', trimmed.substring(0, 200))
        this.emit('event', { event: 'log', level: 'info', message: trimmed })
      }
    }
  }

  private toolResultContentToString(content: unknown): string {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) {
      try {
        return JSON.stringify(content ?? '')
      } catch {
        return ''
      }
    }
    return content
      .map((part: unknown) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '')
        }
        return ''
      })
      .join('')
  }

  /** Stream-json emits tool outcomes as `user` messages with tool_result content blocks. */
  private emitToolResultsFromUserPayload(msg: Record<string, unknown>): void {
    const message = msg.message as Record<string, unknown> | undefined
    const raw = message?.content ?? msg.content
    if (!Array.isArray(raw)) return
    for (const block of raw) {
      if (!block || typeof block !== 'object') continue
      const b = block as Record<string, unknown>
      if (b.type !== 'tool_result') continue
      const toolUseId =
        (typeof b.tool_use_id === 'string' && b.tool_use_id) ||
        (typeof b.toolUseId === 'string' && b.toolUseId) ||
        ''
      if (!toolUseId) continue
      const output = this.toolResultContentToString(b.content)
      const isError = b.is_error === true
      dbg('user/tool_result', 'tool_use_id=', toolUseId, 'is_error=', isError)
      this.emit('event', {
        event: 'tool_result',
        tool_use_id: toolUseId,
        output,
        is_error: isError,
      })
    }
  }

  private handleStreamJsonMessage(msg: Record<string, unknown>, currentMsgId: string): void {
    const type = msg.type as string

    if (msg.session_id && !this.conversationId) {
      this.conversationId = msg.session_id as string
      dbg('session', 'conversationId=', this.conversationId)
    }

    switch (type) {
      case 'assistant': {
        const message = msg.message as Record<string, unknown> | undefined
        const content = (message?.content ?? msg.content) as Array<{ type: string; text?: string }> | undefined
        dbg('assistant', 'has message wrapper=', !!message, 'content blocks=', content?.length ?? 0)
        if (content) {
          for (const block of content) {
            dbg('assistant-block', 'type=', block.type, 'textLen=', block.text?.length ?? 0)
            if (block.type === 'text' && block.text) {
              this.emit('event', {
                event: 'content_delta',
                delta: block.text
              })
            } else if (block.type === 'tool_use') {
              const toolBlock = block as Record<string, unknown>
              const id =
                (typeof toolBlock.id === 'string' && toolBlock.id) ||
                (typeof toolBlock.tool_use_id === 'string' && toolBlock.tool_use_id) ||
                crypto.randomUUID()
              const rawInput = toolBlock.input
              const inputObj =
                rawInput !== undefined &&
                rawInput !== null &&
                typeof rawInput === 'object' &&
                !Array.isArray(rawInput)
                  ? (rawInput as Record<string, unknown>)
                  : {}
              this.emit('event', {
                event: 'tool_use',
                id,
                tool:
                  (typeof toolBlock.name === 'string' && toolBlock.name) ||
                  (typeof toolBlock.tool === 'string' && toolBlock.tool) ||
                  'unknown',
                input: inputObj,
              })
            }
          }
        }
        break
      }

      case 'user': {
        this.emitToolResultsFromUserPayload(msg)
        break
      }

      case 'result': {
        const subtype = msg.subtype as string | undefined
        dbg('result', 'subtype=', subtype)
        // Success `result` repeats the final assistant text already sent via `assistant`
        // stream lines — emitting it again duplicates the whole summary in the UI.
        const errors = msg.errors as string[] | undefined
        if (Array.isArray(errors) && errors.length > 0) {
          const errText = errors.filter(Boolean).join('\n')
          if (errText) {
            this.emit('event', {
              event: 'content_delta',
              delta: `\n\n**Error:** ${errText}`,
            })
          }
        }
        const usage = msg.usage as Record<string, unknown> | undefined
        if (usage && typeof usage === 'object') {
          this.emit('event', {
            event: 'usage_update',
            input_tokens: Number(usage.input_tokens ?? 0),
            output_tokens: Number(usage.output_tokens ?? 0),
            cache_read_input_tokens: Number(usage.cache_read_input_tokens ?? 0),
            cache_creation_input_tokens: Number(
              usage.cache_creation_input_tokens ?? 0,
            ),
            total_cost_usd:
              typeof msg.total_cost_usd === 'number' ? msg.total_cost_usd : undefined,
          })
        }
        if (msg.session_id) {
          this.conversationId = msg.session_id as string
        }
        // Stream-json + open pipe: CLI waits forever for more stdin unless we EOF.
        this.endChildStdin()
        this.emitMessageCompleteIfNeeded(currentMsgId, 0)
        break
      }

      case 'tool_result':
      case 'tool': {
        dbg('tool_result', 'tool_use_id=', msg.tool_use_id || msg.id)
        const topContent = msg.content
        const out =
          typeof topContent === 'string'
            ? topContent
            : this.toolResultContentToString(topContent)
        this.emit('event', {
          event: 'tool_result',
          tool_use_id: (msg.tool_use_id || msg.id) as string,
          output: out,
          is_error: msg.is_error === true,
        })
        break
      }

      case 'system': {
        const subtype = msg.subtype as string | undefined
        dbg('system', 'subtype=', subtype, 'session_id=', msg.session_id)
        if (subtype === 'init') {
          if (msg.session_id) {
            this.conversationId = msg.session_id as string
          }
        }
        this.emit('event', {
          event: 'system',
          subtype,
          data: msg
        })
        break
      }

      case 'control_request': {
        const requestId = msg.request_id as string | undefined
        const inner = msg.request as Record<string, unknown> | undefined
        if (inner?.subtype === 'can_use_tool' && requestId) {
          const toolUseId = (inner.tool_use_id as string) || ''
          const suggestions = inner.permission_suggestions as unknown[] | undefined
          this.pendingPermissionMeta.set(requestId, {
            toolUseId,
            suggestions,
          })
          this.emit('event', {
            event: 'permission_request',
            id: requestId,
            tool: (inner.tool_name as string) || 'unknown',
            input: (inner.input as Record<string, unknown>) || {},
            tool_use_id: toolUseId,
            permission_suggestions: suggestions,
          })
        }
        break
      }

      default: {
        dbg('unknown-type', 'type=', type, 'raw=', JSON.stringify(msg).substring(0, 300))
        this.emit('event', {
          event: 'raw',
          type,
          data: msg
        })
      }
    }
  }
}
