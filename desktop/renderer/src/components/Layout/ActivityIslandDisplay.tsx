import React from 'react'
import { Cpu, Sparkles } from 'lucide-react'

export interface ActivityIslandDisplayProps {
  brief: string
  isStreaming: boolean
  sessionLine: string
  turnLine: string
  /** `overlay` = desktop floating widget (drag region, open app). `embedded` = inside main UI. */
  variant?: 'overlay' | 'embedded'
  onOpenApp?: () => void
}

export function ActivityIslandDisplay({
  brief,
  isStreaming,
  sessionLine,
  turnLine,
  variant = 'embedded',
  onOpenApp,
}: ActivityIslandDisplayProps) {
  const isOverlay = variant === 'overlay'

  const pill = (
    <div
      className={
        isOverlay
          ? 'drag-region flex max-w-[min(96vw,520px)] min-w-[260px] cursor-move items-center gap-3 rounded-[22px] border border-white/15 bg-[#141418]/95 px-4 py-2.5 text-left shadow-2xl backdrop-blur-md'
          : 'flex max-w-[min(92vw,520px)] items-center gap-3 rounded-[22px] border border-border/50 bg-[#1a1a1e]/92 px-4 py-2.5 text-left shadow-xl backdrop-blur-md'
      }
    >
      <div className="flex shrink-0 items-center justify-center">
        {isStreaming ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
        ) : (
          <Sparkles size={15} className="text-amber-300/90" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium leading-snug text-white/95">{brief}</p>
        {(sessionLine || turnLine) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/55">
            {sessionLine && (
              <span className="inline-flex items-center gap-1">
                <Cpu size={10} className="shrink-0 opacity-80" />
                <span className="font-mono tabular-nums">{sessionLine}</span>
              </span>
            )}
            {turnLine && sessionLine && (
              <span className="text-white/35" aria-hidden>
                ·
              </span>
            )}
            {turnLine && (
              <span className="font-mono tabular-nums text-white/50">{turnLine}</span>
            )}
          </div>
        )}
      </div>

      {isOverlay && onOpenApp && (
        <button
          type="button"
          className="no-drag shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={(e) => {
            e.stopPropagation()
            onOpenApp()
          }}
        >
          Open
        </button>
      )}
    </div>
  )

  if (isOverlay) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-[2147483647] flex items-end justify-center px-3 pb-2"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex justify-center">{pill}</div>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[52px] z-[200] flex -translate-x-1/2 justify-center px-4"
      aria-live="polite"
    >
      <div className="pointer-events-auto">{pill}</div>
    </div>
  )
}
