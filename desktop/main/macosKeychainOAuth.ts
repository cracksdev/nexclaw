import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from 'fs'
import { homedir, userInfo } from 'os'
import { join } from 'path'

function log(...args: unknown[]): void {
  console.log('[CLI:keychain-oauth]', ...args)
}

function claudeConfigDir(env: NodeJS.ProcessEnv): string {
  return (env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize('NFC')
}

/**
 * Must match src/utils/secureStorage/macOsKeychainHelpers.ts exactly.
 * Default prod service: "Claude Code-credentials"
 */
function claudeCodeCredentialsServiceName(env: NodeJS.ProcessEnv): string {
  const oauthSuffix = env.CLAUDE_CODE_KEYCHAIN_OAUTH_SUFFIX ?? ''
  const dir = claudeConfigDir(env)
  const isDefault = !env.CLAUDE_CONFIG_DIR
  const dirHash = isDefault
    ? ''
    : `-${createHash('sha256').update(dir).digest('hex').substring(0, 8)}`
  return `Claude Code${oauthSuffix}-credentials${dirHash}`
}

type KeychainCredentialsJson = {
  claudeAiOauth?: { accessToken?: string; refreshToken?: string | null }
}

function extractOAuthToken(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as KeychainCredentialsJson
    const token = data?.claudeAiOauth?.accessToken
    if (typeof token === 'string' && token.length > 0) return token
  } catch (e) {
    log('JSON parse failed:', e instanceof Error ? e.message : String(e))
  }
  return null
}

/**
 * Electron main process reads Keychain and injects CLAUDE_CODE_OAUTH_TOKEN.
 *
 * If Keychain read succeeds AND ~/.claude/.credentials.json does NOT exist,
 * also writes the credentials to disk so the CLI child process has a
 * plaintext fallback (macOS Keychain ACLs may block the child).
 */
export function tryInjectClaudeOAuthFromKeychain(env: NodeJS.ProcessEnv): boolean {
  if (process.platform !== 'darwin') return false
  if (env.CLAUDE_CODE_OAUTH_TOKEN) {
    log('CLAUDE_CODE_OAUTH_TOKEN already set, skipping')
    return false
  }

  const account = env.USER || (() => { try { return userInfo().username } catch { return '' } })()
  const service = claudeCodeCredentialsServiceName(env)
  const configDir = claudeConfigDir(env)
  const credPath = join(configDir, '.credentials.json')

  log('attempt:', { account, service, configDir, credPath, credFileExists: existsSync(credPath) })

  // --- Strategy 1: read existing plaintext .credentials.json ---
  if (existsSync(credPath)) {
    try {
      const raw = readFileSync(credPath, 'utf8')
      const token = extractOAuthToken(raw)
      if (token) {
        log('token from .credentials.json, len=', token.length)
        env.CLAUDE_CODE_OAUTH_TOKEN = token
        return true
      }
      log('.credentials.json exists but no valid token inside')
    } catch (e) {
      log('.credentials.json read error:', e instanceof Error ? e.message : String(e))
    }
  }

  // --- Strategy 2: read Keychain via security CLI ---
  let keychainRaw: string | null = null
  try {
    const out = execFileSync(
      '/usr/bin/security',
      ['find-generic-password', '-a', account, '-w', '-s', service],
      { encoding: 'utf8', timeout: 15_000, maxBuffer: 2_000_000, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    keychainRaw = out?.trim() ?? null
    log('security returned', keychainRaw ? `${keychainRaw.length} chars` : 'empty')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const code = (e as { status?: number })?.status
    log('security failed:', { code, msg: msg.substring(0, 300) })
    log('TIP: run in Terminal:')
    log(`  security find-generic-password -a "${account}" -w -s "${service}"`)
    log('If that also fails, re-run: claude login   (or nexclaw /login)')
    return false
  }

  if (!keychainRaw) {
    log('keychain entry empty')
    return false
  }

  const token = extractOAuthToken(keychainRaw)
  if (!token) {
    log('keychain JSON has no claudeAiOauth.accessToken')
    return false
  }

  log('token from Keychain, len=', token.length)
  env.CLAUDE_CODE_OAUTH_TOKEN = token

  // Write .credentials.json so CLI subprocess has plaintext fallback
  try {
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }
    writeFileSync(credPath, keychainRaw, { encoding: 'utf8' })
    chmodSync(credPath, 0o600)
    log('wrote .credentials.json for CLI fallback')
  } catch (e) {
    log('could not write .credentials.json:', e instanceof Error ? e.message : String(e))
  }

  return true
}
