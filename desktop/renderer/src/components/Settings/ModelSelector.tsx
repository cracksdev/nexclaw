import React from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

const MODELS_BY_PROVIDER: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (default)' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'o1', label: 'o1' },
    { id: 'o1-mini', label: 'o1 Mini' },
    { id: 'o3-mini', label: 'o3 Mini' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  ollama: [
    { id: 'llama3.2:3b', label: 'Llama 3.2 (3B)' },
    { id: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder (7B)' },
    { id: 'deepseek-coder-v2:16b', label: 'DeepSeek Coder V2 (16B)' },
    { id: 'codellama:13b', label: 'Code Llama (13B)' },
    { id: 'mistral:7b', label: 'Mistral (7B)' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'deepseek-coder', label: 'DeepSeek Coder' },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  codex: [
    { id: 'codexplan', label: 'Codex Plan' },
    { id: 'codexspark', label: 'Codex Spark' },
  ],
  github: [
    { id: 'gpt-4o', label: 'GPT-4o (GitHub)' },
    { id: 'o1', label: 'o1 (GitHub)' },
  ],
  custom: []
}

export function ModelSelector() {
  const { provider, model, setModel } = useSettingsStore()
  const models = MODELS_BY_PROVIDER[provider] || []

  return (
    <section>
      <h3 className="text-sm font-medium text-text-primary mb-1">Model</h3>
      <p className="text-xs text-text-muted mb-2">
        {provider === 'anthropic'
          ? 'Select the Claude model to use. Claude Sonnet 4 is recommended.'
          : models.length > 0
            ? 'Select a model or type a custom one'
            : 'Enter a model identifier'}
      </p>
      {models.length > 0 ? (
        <div className="space-y-2">
          <select
            value={models.some((m) => m.id === model) ? model : '__custom__'}
            onChange={(e) => {
              if (e.target.value !== '__custom__') {
                setModel(e.target.value)
              }
            }}
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
            <option value="__custom__">Custom model...</option>
          </select>
          {!models.some((m) => m.id === model) && (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Enter model name"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 font-mono"
            />
          )}
        </div>
      ) : (
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Enter model name"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 font-mono"
        />
      )}
    </section>
  )
}
