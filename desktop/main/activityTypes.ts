export interface ActivitySyncPayload {
  brief: string
  isStreaming: boolean
  sessionInputTokens: number
  sessionOutputTokens: number
  lastTurnInput?: number
  lastTurnOutput?: number
}
