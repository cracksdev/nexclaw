import { create } from 'zustand'
import { formatSessionTokenLine, formatTurnTokenLine } from '../lib/activityFormat'

export function toolBrief(toolName: string): string {
  const t = toolName.toLowerCase()
  if (t.includes('write')) return 'Writing file…'
  if (t.includes('read')) return 'Reading file…'
  if (t.includes('edit')) return 'Editing file…'
  if (t.includes('glob') || t.includes('file_search')) return 'Finding files…'
  if (t.includes('grep') || t.includes('search')) return 'Searching…'
  if (t.includes('bash')) return 'Running command…'
  if (t.includes('task')) return 'Updating tasks…'
  return `Using ${toolName}…`
}

export interface ActivityIslandState {
  brief: string
  isStreaming: boolean
  lastToolName: string | null
  sessionInputTokens: number
  sessionOutputTokens: number
  lastTurnInput: number
  lastTurnOutput: number
  windowFocused: boolean

  setWindowFocused: (v: boolean) => void
  startAssistantTurn: () => void
  setBrief: (brief: string) => void
  noteToolUse: (name: string) => void
  noteWritingResponse: () => void
  applyUsage: (input: number, output: number) => void
  onTurnComplete: () => void
  onError: (msg: string) => void
  resetSessionTotals: () => void
  formatSessionLine: () => string
  formatTurnLine: () => string
}

export const useActivityIslandStore = create<ActivityIslandState>((set, get) => ({
  brief: 'Ready',
  isStreaming: false,
  lastToolName: null,
  sessionInputTokens: 0,
  sessionOutputTokens: 0,
  lastTurnInput: 0,
  lastTurnOutput: 0,
  windowFocused: true,

  setWindowFocused: (v) => set({ windowFocused: v }),

  startAssistantTurn: () =>
    set({
      isStreaming: true,
      lastToolName: null,
      brief: 'Thinking…',
      lastTurnInput: 0,
      lastTurnOutput: 0,
    }),

  setBrief: (brief) => set({ brief }),

  noteToolUse: (name) =>
    set({
      lastToolName: name,
      brief: toolBrief(name),
    }),

  noteWritingResponse: () =>
    set({
      brief: 'Writing response…',
    }),

  applyUsage: (input, output) =>
    set((s) => ({
      lastTurnInput: input,
      lastTurnOutput: output,
      sessionInputTokens: s.sessionInputTokens + input,
      sessionOutputTokens: s.sessionOutputTokens + output,
    })),

  onTurnComplete: () =>
    set({
      isStreaming: false,
      lastToolName: null,
      brief: 'Ready',
    }),

  onError: (msg) =>
    set({
      isStreaming: false,
      brief: msg.length > 80 ? `${msg.slice(0, 77)}…` : msg,
    }),

  resetSessionTotals: () =>
    set({
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      lastTurnInput: 0,
      lastTurnOutput: 0,
    }),

  formatSessionLine: () => {
    const { sessionInputTokens: i, sessionOutputTokens: o } = get()
    return formatSessionTokenLine(i, o)
  },

  formatTurnLine: () => {
    const { lastTurnInput: i, lastTurnOutput: o } = get()
    return formatTurnTokenLine(i, o)
  },
}))
