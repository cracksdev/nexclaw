import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ActivityIslandDisplay } from './components/Layout/ActivityIslandDisplay'
import { formatSessionTokenLine, formatTurnTokenLine } from './lib/activityFormat'
import './styles/globals.css'
import './styles/widget-overlay.css'

interface WidgetPayload {
  brief: string
  isStreaming: boolean
  sessionInputTokens: number
  sessionOutputTokens: number
  lastTurnInput?: number
  lastTurnOutput?: number
}

const defaultState: WidgetPayload = {
  brief: 'NexClaw',
  isStreaming: false,
  sessionInputTokens: 0,
  sessionOutputTokens: 0,
  lastTurnInput: 0,
  lastTurnOutput: 0,
}

function WidgetRoot() {
  const [p, setP] = useState<WidgetPayload>(defaultState)

  useEffect(() => {
    const off = window.nexClaw?.activity?.onWidgetUpdate?.((payload: WidgetPayload) => {
      setP({
        brief: typeof payload.brief === 'string' ? payload.brief : defaultState.brief,
        isStreaming: Boolean(payload.isStreaming),
        sessionInputTokens: Number(payload.sessionInputTokens ?? 0),
        sessionOutputTokens: Number(payload.sessionOutputTokens ?? 0),
        lastTurnInput: Number(payload.lastTurnInput ?? 0),
        lastTurnOutput: Number(payload.lastTurnOutput ?? 0),
      })
    })
    return () => off?.()
  }, [])

  const sessionLine = formatSessionTokenLine(p.sessionInputTokens, p.sessionOutputTokens)
  const turnLine = formatTurnTokenLine(
    p.lastTurnInput ?? 0,
    p.lastTurnOutput ?? 0,
  )

  return (
    <ActivityIslandDisplay
      brief={p.brief}
      isStreaming={p.isStreaming}
      sessionLine={sessionLine}
      turnLine={turnLine}
      variant="overlay"
      onOpenApp={() => void window.nexClaw?.window?.focusMain?.()}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WidgetRoot />
  </React.StrictMode>,
)
