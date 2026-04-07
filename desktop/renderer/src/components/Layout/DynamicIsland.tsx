import React from 'react'
import { useActivityIslandStore } from '../../stores/activityIslandStore'
import { ActivityIslandDisplay } from './ActivityIslandDisplay'

/** In-app activity pill (optional; primary UX is the desktop overlay widget). */
export function DynamicIsland() {
  const brief = useActivityIslandStore((s) => s.brief)
  const isStreaming = useActivityIslandStore((s) => s.isStreaming)
  const formatSessionLine = useActivityIslandStore((s) => s.formatSessionLine)
  const formatTurnLine = useActivityIslandStore((s) => s.formatTurnLine)

  return (
    <ActivityIslandDisplay
      brief={brief}
      isStreaming={isStreaming}
      sessionLine={formatSessionLine()}
      turnLine={formatTurnLine()}
      variant="embedded"
    />
  )
}
