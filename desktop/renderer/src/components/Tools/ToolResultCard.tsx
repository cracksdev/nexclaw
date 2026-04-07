import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Terminal, FileText, Search, Plug, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { ToolUse } from '../../stores/chatStore'
import { DiffViewer } from './DiffViewer'
import { BashOutput } from './BashOutput'
import {
  HighlightedCode,
  formatMetaJson,
  inferHighlightLanguage,
  splitToolInputForDisplay,
} from './HighlightedCode'

interface ToolResultCardProps {
  toolUse: ToolUse
}

const TOOL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  bash: { icon: <Terminal size={14} />, color: 'text-tool-bash', label: 'Bash' },
  shell: { icon: <Terminal size={14} />, color: 'text-tool-bash', label: 'Shell' },
  read: { icon: <FileText size={14} />, color: 'text-tool-file', label: 'Read File' },
  write: { icon: <FileText size={14} />, color: 'text-tool-file', label: 'Write File' },
  edit: { icon: <FileText size={14} />, color: 'text-tool-file', label: 'Edit File' },
  grep: { icon: <Search size={14} />, color: 'text-tool-search', label: 'Search' },
  glob: { icon: <Search size={14} />, color: 'text-tool-search', label: 'Find Files' },
  mcp: { icon: <Plug size={14} />, color: 'text-tool-mcp', label: 'MCP Tool' },
}

function getToolConfig(toolName: string) {
  const lower = toolName.toLowerCase()
  for (const [key, config] of Object.entries(TOOL_CONFIG)) {
    if (lower.includes(key)) return config
  }
  return { icon: <Plug size={14} />, color: 'text-text-secondary', label: toolName }
}

function outputLanguage(output: string): string {
  const t = output.trimStart()
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      JSON.parse(output)
      return 'json'
    } catch {
      /* fall through */
    }
  }
  return inferHighlightLanguage('output', output)
}

export function ToolResultCard({ toolUse }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = getToolConfig(toolUse.tool)

  const inputParts = useMemo(
    () => splitToolInputForDisplay(toolUse.input || {}),
    [toolUse.input],
  )

  const statusIcon = toolUse.status === 'running'
    ? <Loader2 size={14} className="animate-spin text-accent" />
    : toolUse.status === 'complete'
      ? <CheckCircle size={14} className="text-success" />
      : toolUse.status === 'error'
        ? <XCircle size={14} className="text-error" />
        : null

  const isBash = toolUse.tool.toLowerCase().includes('bash') || toolUse.tool.toLowerCase().includes('shell')
  const isDiff = toolUse.tool.toLowerCase().includes('edit') || toolUse.tool.toLowerCase().includes('write')

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg-secondary">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-bg-hover transition-colors"
      >
        {expanded ? <ChevronDown size={14} className="text-text-muted" /> : <ChevronRight size={14} className="text-text-muted" />}
        <span className={config.color}>{config.icon}</span>
        <span className="text-xs font-medium text-text-secondary flex-1 truncate">
          {config.label}
          {toolUse.input.command && (
            <span className="ml-2 font-mono text-text-muted">
              {String(toolUse.input.command).slice(0, 60)}
            </span>
          )}
          {toolUse.input.path && (
            <span className="ml-2 font-mono text-text-muted">
              {String(toolUse.input.path)}
            </span>
          )}
        </span>
        {statusIcon}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {toolUse.input && Object.keys(toolUse.input).length > 0 && (
            <div className="px-3 py-2 border-b border-border space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Input</p>
              {Object.keys(inputParts.meta).length > 0 && (
                <div className="rounded-lg overflow-hidden border border-border/60">
                  <HighlightedCode
                    code={formatMetaJson(inputParts.meta)}
                    language="json"
                  />
                </div>
              )}
              {inputParts.chunks.map((chunk) => (
                <div key={chunk.field} className="rounded-lg overflow-hidden border border-border/60">
                  <p className="text-[10px] font-medium text-text-muted bg-bg-primary px-2 py-1 border-b border-border/40 capitalize">
                    {chunk.field.replace(/_/g, ' ')}
                    <span className="ml-2 font-normal opacity-70">({chunk.language})</span>
                  </p>
                  <HighlightedCode code={chunk.code} language={chunk.language} />
                </div>
              ))}
            </div>
          )}

          {toolUse.output && (
            <div className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Output</p>
              {isBash ? (
                <BashOutput output={toolUse.output} />
              ) : isDiff ? (
                <DiffViewer content={toolUse.output} />
              ) : (
                <div className="rounded-lg overflow-hidden border border-border/60 max-h-96 overflow-y-auto">
                  <HighlightedCode
                    code={toolUse.output}
                    language={outputLanguage(toolUse.output)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
