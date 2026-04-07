import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './windowManager'
import { registerIpcHandlers } from './ipcHandlers'
import { CliManager } from './cliManager'
import { initActivityBridge, destroyActivityBridge } from './activityBridge'
import { setMainWindow } from './mainWindowRef'
import { createActivityWidgetWindow, destroyActivityWidgetWindow } from './activityWidgetWindow'
import { initLogger } from './logger'

initLogger()

let mainWindow: BrowserWindow | null = null
let cliManager: CliManager | null = null

if (process.platform === 'win32') {
  app.setAppUserModelId('com.nexclaw.desktop')
}

function wireMainWindow(win: BrowserWindow): void {
  setMainWindow(win)
  win.on('closed', () => {
    destroyActivityWidgetWindow()
    setMainWindow(null)
    mainWindow = null
  })
  initActivityBridge(win)
  createActivityWidgetWindow()
}

app.whenReady().then(async () => {
  cliManager = new CliManager()
  registerIpcHandlers(cliManager)
  mainWindow = createMainWindow()
  wireMainWindow(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
      wireMainWindow(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  cliManager?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  cliManager?.stop()
  destroyActivityWidgetWindow()
  destroyActivityBridge()
})
