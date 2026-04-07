import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

const KEY_LABELS: Record<string, { envVar: string; placeholder: string }> = {
  openai: { envVar: 'OPENAI_API_KEY', placeholder: 'sk-...' },
  gemini: { envVar: 'GEMINI_API_KEY', placeholder: 'AIza...' },
  deepseek: { envVar: 'OPENAI_API_KEY', placeholder: 'sk-...' },
  github: { envVar: 'GITHUB_TOKEN', placeholder: 'ghp_...' },
  codex: { envVar: 'CODEX_API_KEY', placeholder: 'Enter Codex API key' },
  ollama: { envVar: '', placeholder: 'No API key needed for local Ollama' },
  custom: { envVar: 'OPENAI_API_KEY', placeholder: 'Enter API key' }
}

export function ApiKeyManager() {
  const { provider, apiKey, setApiKey } = useSettingsStore()
  const [visible, setVisible] = useState(false)
  const config = KEY_LABELS[provider] || KEY_LABELS.custom

  if (provider === 'ollama') {
    return (
      <section>
        <h3 className="text-sm font-medium text-text-primary mb-1">API Key</h3>
        <p className="text-xs text-text-muted">
          Ollama runs locally — no API key required. Make sure Ollama is running on your machine.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-sm font-medium text-text-primary mb-1">API Key</h3>
      <p className="text-xs text-text-muted mb-2">
        Stored in memory only. Set <span className="font-mono text-accent">{config.envVar}</span> env var for persistence.
      </p>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config.placeholder}
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 font-mono"
        />
        <button
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-primary"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </section>
  )
}
