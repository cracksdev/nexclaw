import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

const highlighterStyle: React.CSSProperties = {
  margin: 0,
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.5,
  maxHeight: 360,
  overflow: 'auto',
}

interface HighlightedCodeProps {
  code: string
  language: string
  showLineNumbers?: boolean
}

export function HighlightedCode({
  code,
  language,
  showLineNumbers,
}: HighlightedCodeProps) {
  const lines = code.split('\n').length
  const numbers = showLineNumbers ?? lines > 14

  return (
    <SyntaxHighlighter
      language={language}
      style={oneLight}
      customStyle={highlighterStyle}
      showLineNumbers={numbers}
      wrapLines
      wrapLongLines
      PreTag="div"
    >
      {code.replace(/\n$/, '')}
    </SyntaxHighlighter>
  )
}

const CODE_FIELD_KEYS = new Set([
  'content',
  'new_string',
  'old_string',
  'diff',
  'stdin',
  'script',
  'text',
  'body',
  'html',
  'source',
])

function isLargeCodeString(key: string, value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.includes('\n')) return true
  if (value.length >= 120) return true
  if (CODE_FIELD_KEYS.has(key) && value.length > 72) return true
  if (/content|string|body|html|diff|patch/i.test(key) && value.length > 96) {
    return true
  }
  return false
}

export function inferHighlightLanguage(key: string, code: string): string {
  const t = code.trimStart()
  if (
    t.startsWith('<!DOCTYPE') ||
    t.startsWith('<html') ||
    (t.startsWith('<') && /<\/[a-z][\w-]*>/i.test(t))
  ) {
    return 'markup'
  }
  if (t.startsWith('diff --git') || t.startsWith('--- ') || t.startsWith('+++ ')) {
    return 'diff'
  }
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      JSON.parse(code)
      return 'json'
    } catch {
      /* fall through */
    }
  }
  if (key === 'command' || key === 'cmd' || /bash|shell|sh/i.test(key)) {
    return 'bash'
  }
  if (
    /\b(function|const|let|var|import |export |=>)\b/.test(t) ||
    t.includes('document.') ||
    t.includes('window.')
  ) {
    return 'javascript'
  }
  return 'typescript'
}

export type ToolInputChunk = { field: string; code: string; language: string }

export function splitToolInputForDisplay(
  input: Record<string, unknown>,
): { meta: Record<string, unknown>; chunks: ToolInputChunk[] } {
  const meta: Record<string, unknown> = {}
  const chunks: ToolInputChunk[] = []

  for (const [key, value] of Object.entries(input)) {
    if (isLargeCodeString(key, value)) {
      chunks.push({
        field: key,
        code: value,
        language: inferHighlightLanguage(key, value),
      })
    } else {
      meta[key] = value
    }
  }

  return { meta, chunks }
}

export function formatMetaJson(meta: Record<string, unknown>): string {
  try {
    return JSON.stringify(meta, null, 2)
  } catch {
    return String(meta)
  }
}
