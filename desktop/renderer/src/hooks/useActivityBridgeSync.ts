import { useEffect } from 'react'
import { useActivityIslandStore } from '../stores/activityIslandStore'

export function useActivityBridgeSync() {
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      const api = window.nexClaw?.activity
      if (!api?.sync) return
      const s = useActivityIslandStore.getState()
      void api.sync({
        brief: s.brief,
        isStreaming: s.isStreaming,
        sessionInputTokens: s.sessionInputTokens,
        sessionOutputTokens: s.sessionOutputTokens,
        lastTurnInput: s.lastTurnInput,
        lastTurnOutput: s.lastTurnOutput,
      })
    }

    const unsub = useActivityIslandStore.subscribe(() => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(flush, 320)
    })

    const offFocus = window.nexClaw?.activity?.onFocusState?.((focused) => {
      useActivityIslandStore.getState().setWindowFocused(focused)
      flush()
    })

    flush()

    return () => {
      unsub()
      offFocus?.()
      if (debounce) clearTimeout(debounce)
    }
  }, [])
}
