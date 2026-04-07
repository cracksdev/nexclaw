import { app } from 'electron'
import { createWriteStream, mkdirSync, type WriteStream } from 'fs'
import { join } from 'path'

let stream: WriteStream | null = null

function getLogPath(): string {
  const logDir = join(app.getPath('userData'), 'logs')
  mkdirSync(logDir, { recursive: true })
  return join(logDir, 'main.log')
}

export function initLogger(): void {
  const logPath = getLogPath()
  stream = createWriteStream(logPath, { flags: 'a' })

  const write = (level: string, args: unknown[]): void => {
    const line = `[${new Date().toISOString()}] [${level}] ${args.map(a =>
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ')}\n`
    stream?.write(line)
  }

  const origLog = console.log.bind(console)
  const origError = console.error.bind(console)
  const origWarn = console.warn.bind(console)

  console.log = (...args) => { origLog(...args); write('INFO', args) }
  console.error = (...args) => { origError(...args); write('ERROR', args) }
  console.warn = (...args) => { origWarn(...args); write('WARN', args) }

  console.log(`[logger] Log file: ${logPath}`)
}

export function getLogFilePath(): string {
  return getLogPath()
}
