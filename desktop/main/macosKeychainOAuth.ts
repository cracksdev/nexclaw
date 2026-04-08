import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { homedir, userInfo } from 'os'
import { join } from 'path'

/**
 * Mirrors src/utils/secureStorage/macOsKeychainHelpers.ts service name so we read
 * the same Keychain item as `claude /login`. OAuth suffix is empty for production;
 * set CLAUDE_CODE_KEYCHAIN_OAUTH_SUFFIX=-staging-oauth if your CLI used staging.
 */
function claudeConfigDir(env: NodeJS.ProcessEnv): string {
  return (env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize('NFC')
}

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
  claudeAiOauth?: { accessToken?: string }
}

/**
 * GUI-spawned Node often cannot read the user's login Keychain via `security`
 * (TCC / code identity). Electron's main process can succeed; inject the OAuth
 * access token so cli.mjs skips Keychain reads for this turn.
 *
 * Note: env-only token has no refreshToken — if access token expires, user may
 * need /login again or restart from Terminal once; primary goal is fixing 401
 * when Keychain read fails in the child only.
 */
export function tryInjectClaudeOAuthFromKeychain(env: NodeJS.ProcessEnv): boolean {
  if (process.platform !== 'darwin') return false
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return false

  const account = env.USER || userInfo().username
  const service = claudeCodeCredentialsServiceName(env)

  try {
    const out = execFileSync(
      '/usr/bin/security',
      ['find-generic-password', '-a', account, '-w', '-s', service],
      { encoding: 'utf8', timeout: 15_000, maxBuffer: 2_000_000 },
    )
    const trimmed = out?.trim()
    if (!trimmed) return false

    const data = JSON.parse(trimmed) as KeychainCredentialsJson
    const token = data?.claudeAiOauth?.accessToken
    if (typeof token === 'string' && token.length > 0) {
      env.CLAUDE_CODE_OAUTH_TOKEN = token
      return true
    }
  } catch {
    /* ENOACCESS, wrong service, parse error — CLI may still try keychain */
  }
  return false
}
