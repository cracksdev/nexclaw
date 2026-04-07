import { createInterface } from 'readline'
import type { GuiCommand } from './protocol.js'

export type CommandHandler = (command: GuiCommand) => void

export function startInputHandler(onCommand: CommandHandler): void {
  const rl = createInterface({
    input: process.stdin,
    terminal: false
  })

  rl.on('line', (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const command = JSON.parse(trimmed) as GuiCommand
      onCommand(command)
    } catch {
      // Ignore malformed input
    }
  })

  rl.on('close', () => {
    process.exit(0)
  })
}
