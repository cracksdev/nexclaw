import React from 'react'

interface DiffViewerProps {
  content: string
}

export function DiffViewer({ content }: DiffViewerProps) {
  const lines = content.split('\n')

  return (
    <div className="font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto rounded bg-bg-primary">
      {lines.map((line, i) => {
        let lineClass = 'text-text-secondary'
        let bgClass = ''

        if (line.startsWith('+') && !line.startsWith('+++')) {
          lineClass = 'text-success'
          bgClass = 'bg-success/5'
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          lineClass = 'text-error'
          bgClass = 'bg-error/5'
        } else if (line.startsWith('@@')) {
          lineClass = 'text-accent'
          bgClass = 'bg-accent/5'
        } else if (line.startsWith('diff') || line.startsWith('index')) {
          lineClass = 'text-text-muted'
        }

        return (
          <div key={i} className={`px-3 py-0.5 ${bgClass}`}>
            <span className={lineClass}>{line}</span>
          </div>
        )
      })}
    </div>
  )
}
