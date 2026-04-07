import React from 'react'

interface BashOutputProps {
  output: string
}

export function BashOutput({ output }: BashOutputProps) {
  return (
    <pre className="text-xs font-mono text-text-secondary overflow-x-auto max-h-64 overflow-y-auto rounded bg-bg-primary p-2 whitespace-pre-wrap">
      {output}
    </pre>
  )
}
