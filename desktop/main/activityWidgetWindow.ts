import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'
import type { ActivitySyncPayload } from './activityTypes'
import { rendererLoadedFromDevServer } from './rendererEnv'

const isDev = !app.isPackaged

let widgetWindow: BrowserWindow | null = null
let lastWidgetPayload: ActivitySyncPayload | null = null

function defaultWidgetBounds(): { x: number; y: number; width: number; height: number } {
  const { width: sw, height: sh, x: sx, y: sy } = screen.getPrimaryDisplay().workArea
  const w = 400
  const h = 92
  return {
    width: w,
    height: h,
    x: Math.round(sx + (sw - w) / 2),
    /** Bottom of work area (sits just above the Windows taskbar / macOS Dock region). */
    y: Math.round(sy + sh - h - 10),
  }
}

export function pushActivityWidgetPayload(payload: ActivitySyncPayload): void {
  lastWidgetPayload = payload
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  const wc = widgetWindow.webContents
  if (wc.isDestroyed()) return
  wc.send('activity:widget-update', payload)
}

export function createActivityWidgetWindow(): BrowserWindow {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return widgetWindow
  }

  const b = defaultWidgetBounds()

  const win = new BrowserWindow({
    ...b,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    /** Windows: small floating palette style; macOS also benefits */
    type: process.platform === 'darwin' ? 'panel' : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: rendererLoadedFromDevServer(),
    },
  })

  try {
    win.setAlwaysOnTop(true, 'screen-saver')
  } catch {
    win.setAlwaysOnTop(true)
  }

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  win.setMenuBarVisibility(false)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
    void win.loadURL(`${base}/widget.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/widget.html'))
  }

  win.webContents.once('did-finish-load', () => {
    if (lastWidgetPayload && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('activity:widget-update', lastWidgetPayload)
    }
  })

  win.on('ready-to-show', () => {
    if (!win.isDestroyed()) win.showInactive()
  })

  win.on('closed', () => {
    widgetWindow = null
  })

  widgetWindow = win
  return win
}

export function destroyActivityWidgetWindow(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.removeAllListeners('closed')
    widgetWindow.destroy()
  }
  widgetWindow = null
}
