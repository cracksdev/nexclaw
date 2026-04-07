# NexClaw VS Code Extension

A VS Code companion for NexClaw with a visual **Control Center** plus terminal-first workflows.

## Features

- **Control Center sidebar UI** in the Activity Bar:
  - Launch NexClaw
  - Open repository/docs
  - Open VS Code theme picker
- **Terminal launch command**: `NexClaw: Launch in Terminal`
- **Built-in dark theme**: `NexClaw Terminal Black` (terminal-inspired, low-glare, neon accents)

## Requirements

- VS Code `1.95+`
- `nexclaw` available in your terminal PATH (`npm install -g @gitlawb/nexclaw`)

## Commands

- `NexClaw: Open Control Center`
- `NexClaw: Launch in Terminal`
- `NexClaw: Open Repository`

## Settings

- `nexclaw.launchCommand` (default: `nexclaw`)
- `nexclaw.terminalName` (default: `NexClaw`)
- `nexclaw.useOpenAIShim` (default: `false`)

## Development

From this folder:

```bash
npm run lint
```

To package (optional):

```bash
npm run package
```
