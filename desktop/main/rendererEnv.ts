import { app } from 'electron'

/**
 * True when windows load the renderer from the Vite dev server (`http://`).
 * False for `loadFile` of built `out/renderer/*.html` (`file://`), including packaged DMG/App.
 *
 * Packaged builds use `file://` with ES module chunks; Chromium may block them unless
 * `webSecurity` is off for those windows.
 */
export function rendererLoadedFromDevServer(): boolean {
  return !app.isPackaged && Boolean(process.env['ELECTRON_RENDERER_URL'])
}
