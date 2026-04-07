import { Tray, nativeImage, Notification, app, BrowserWindow } from 'electron'
import { pushActivityWidgetPayload } from './activityWidgetWindow'
import { getMainWindow } from './mainWindowRef'
import type { ActivitySyncPayload } from './activityTypes'

export type { ActivitySyncPayload } from './activityTypes'

/** Minimal valid PNG (1×1); resized for tray. */
const TRAY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

let tray: Tray | null = null
let lastNotificationAt = 0
const NOTIFY_MIN_MS = 14_000

function trayTooltip(p: ActivitySyncPayload): string {
  const { brief, sessionInputTokens, sessionOutputTokens, lastTurnInput, lastTurnOutput } = p
  const lines: string[] = ['NexClaw']
  if (sessionInputTokens > 0 || sessionOutputTokens > 0) {
    lines.push(
      `Session: ${sessionInputTokens.toLocaleString()} in · ${sessionOutputTokens.toLocaleString()} out tokens`,
    )
  }
  if (
    lastTurnInput !== undefined &&
    lastTurnOutput !== undefined &&
    (lastTurnInput > 0 || lastTurnOutput > 0)
  ) {
    lines.push(
      `Last turn: ${lastTurnInput.toLocaleString()} in · ${lastTurnOutput.toLocaleString()} out`,
    )
  }
  if (brief) lines.push(brief)
  return lines.join('\n').slice(0, 250)
}

export function initActivityBridge(win: BrowserWindow): void {
  if (!tray) {
    try {
      const img = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_PNG}`)
      const sized = img.resize({ width: 16, height: 16 })
      tray = new Tray(sized)
      tray.setToolTip('NexClaw')
      tray.on('click', () => {
        const w = getMainWindow()
        if (w && !w.isDestroyed()) {
          w.show()
          w.focus()
        }
      })
    } catch (e) {
      console.warn('[activityBridge] Tray not available:', e)
    }
  }

  const sendFocus = (focused: boolean) => {
    if (!win.isDestroyed()) {
      win.webContents.send('app:focus-state', focused)
    }
  }

  win.on('focus', () => {
    if (process.platform === 'darwin') {
      app.dock?.setBadge('')
    }
    sendFocus(true)
  })

  win.on('blur', () => {
    sendFocus(false)
  })

  win.on('show', () => sendFocus(win.isFocused()))
}

export function syncBackgroundActivity(payload: ActivitySyncPayload): void {
  pushActivityWidgetPayload(payload)

  if (tray) {
    tray.setToolTip(trayTooltip(payload))
  }

  const mw = getMainWindow()
  const focused = Boolean(mw && !mw.isDestroyed() && mw.isFocused())
  if (process.platform === 'darwin') {
    if (payload.isStreaming) {
      app.dock?.setBadge('·')
    } else {
      app.dock?.setBadge('')
    }
  }

  if (focused || !payload.isStreaming || !payload.brief) {
    return
  }

  const now = Date.now()
  if (now - lastNotificationAt < NOTIFY_MIN_MS) {
    return
  }

  if (!Notification.isSupported()) {
    return
  }

  lastNotificationAt = now

  try {
    const n = new Notification({
      title: 'NexClaw',
      body: payload.brief.slice(0, 180),
      silent: true,
    })
    n.show()
  } catch (e) {
    console.warn('[activityBridge] Notification failed:', e)
  }
}

export function destroyActivityBridge(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
  if (process.platform === 'darwin') {
    app.dock?.setBadge('')
  }
}
