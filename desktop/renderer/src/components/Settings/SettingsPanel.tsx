import React from 'react'
import { X, FolderOpen } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { ModelSelector } from './ModelSelector'
import { ApiKeyManager } from './ApiKeyManager'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'ollama', label: 'Ollama (Local)' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'codex', label: 'Codex' },
  { id: 'github', label: 'GitHub Models' },
  { id: 'custom', label: 'Custom OpenAI-compatible' }
]

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    provider, setProvider,
    baseUrl, setBaseUrl,
    workingDirectory, setWorkingDirectory
  } = useSettingsStore()

  if (!open) return null

  const handleBrowse = async () => {
    const folder = await window.nexClaw?.dialog?.selectFolder()
    if (folder) {
      setWorkingDirectory(folder)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-2xl w-[520px] max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-1">Provider</h3>
            <p className="text-xs text-text-muted mb-2">
              Anthropic uses your existing Claude Code login.
            </p>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </section>

          <ModelSelector />

          {provider !== 'anthropic' && <ApiKeyManager />}

          {provider === 'anthropic' && (
            <section className="bg-accent/5 border border-accent/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-text-primary mb-1">Authentication</h3>
              <p className="text-xs text-text-muted">
                Using your existing Claude Code credentials from <span className="font-mono text-accent">~/.claude/</span>.
                Run <span className="font-mono text-accent">nexclaw</span> in terminal to log in first.
              </p>
            </section>
          )}

          {(provider === 'ollama' || provider === 'custom') && (
            <section>
              <h3 className="text-sm font-medium text-text-primary mb-1">Base URL</h3>
              <p className="text-xs text-text-muted mb-2">
                {provider === 'ollama' ? 'Defaults to http://localhost:11434' : 'Your OpenAI-compatible API endpoint'}
              </p>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50"
              />
            </section>
          )}

          <section>
            <h3 className="text-sm font-medium text-text-primary mb-1">Working Directory</h3>
            <p className="text-xs text-text-muted mb-2">Default project folder for the CLI to operate in</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                placeholder="Select or type a folder path..."
                className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 font-mono"
              />
              <button
                onClick={handleBrowse}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary shrink-0"
                title="Browse for folder"
              >
                <FolderOpen size={16} className="text-accent" />
                Browse
              </button>
            </div>
          </section>

          <section>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!window.nexClaw?.cli) return
                  await window.nexClaw.cli.stop()
                  await window.nexClaw.cli.start(workingDirectory || undefined)
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-btn-primary text-white hover:bg-btn-primary-hover transition-colors"
              >
                Restart CLI
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
