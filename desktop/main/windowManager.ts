import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'node:url'
import { rendererLoadedFromDevServer } from './rendererEnv'

const isDev = !app.isPackaged

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: rendererLoadedFromDevServer(),
    },
    backgroundColor: '#ffffff',
    show: false,
    icon: app.isPackaged
      ? join(process.resourcesPath, '../build/icon.png')
      : join(__dirname, '../../build/icon.png'),
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const file = join(__dirname, '../renderer/index.html')
    void win.loadURL(pathToFileURL(file).href)
  }

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  // F12 ile prodda da DevTools açılabilsin
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      } else {
        win.webContents.openDevTools({ mode: 'detach' })
      }
    }
  })

  return win
}
