# NexClaw

**Use Claude Code with any AI model — OpenAI, Gemini, DeepSeek, Ollama, and more.**

NexClaw is an open-source desktop app that wraps the Claude Code CLI engine and lets you switch AI providers freely. Same powerful coding agent, your choice of model.

> **Disclaimer:** This is an independent open-source project, not affiliated with or endorsed by Anthropic. You use your own API keys and are responsible for compliance with the terms of those services.

---

## What it does

Claude Code is an excellent AI coding agent — but it's locked to Anthropic models. NexClaw breaks that lock:

- **Any LLM, same interface** — OpenAI GPT-4o, Gemini, DeepSeek, Ollama (local), GitHub Models, or any OpenAI-compatible API
- **Full Claude Code feature set** — file editing, bash execution, MCP servers, slash commands, skills, sessions
- **Native desktop app** — Electron-based GUI for Windows and macOS, no terminal required
- **Switch models on the fly** — change provider and API key from Settings, takes effect immediately
- **Production logging** — logs to `%AppData%/nexclaw-desktop/logs/main.log` for easy debugging

---

## Features

- Chat interface powered by the NexClaw CLI (stream-json protocol)
- **Multi-provider support** — Anthropic, OpenAI, Gemini, DeepSeek, Ollama, GitHub Models, Codex, custom OpenAI-compatible endpoints
- **Sessions** — browse and resume past conversations
- **Task board** — project-level task tracking (`.nexclaw/tasks.json`)
- **Skills browser** — discover and use slash command skills
- **Dashboard** — overview of your project and session stats
- **Floating activity widget** — always-on-top status window (Windows & macOS)
- **Auto-approve mode** — `--dangerously-skip-permissions` for trusted environments
- **F12 DevTools** — open browser devtools in production for debugging

---

## Screenshots

<!-- Coming soon -->

---

## Download

Pre-built installers are available on the [Releases](../../releases) page.

| Platform | File |
|----------|------|
| Windows | `nexclaw-x.x.x-setup.exe` |
| macOS | `nexclaw-x.x.x.dmg` |

---

## Build from source

### Prerequisites

- **Node.js** 20+
- **Bun** (for building the CLI)
- **npm**

### 1 — Build the CLI

```bash
# From repo root
npm install
bun run build        # produces dist/cli.mjs
```

### 2 — Build the desktop app

```bash
cd desktop
npm install
npm run build        # compile TypeScript
npm run package:win  # Windows installer → desktop/release/
npm run package:mac  # macOS DMG       → desktop/release/
```

### Development mode

```bash
cd desktop
npm run dev          # hot-reload dev server + Electron
```

---

## Provider setup

Open **Settings** in the app and choose your provider:

| Provider | Required |
|----------|---------|
| Anthropic (Claude) | Existing `nexclaw` / Claude Code login (`~/.claude/`) |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| DeepSeek | `OPENAI_API_KEY` (DeepSeek key) |
| Ollama | No key — just run Ollama locally |
| GitHub Models | `GITHUB_TOKEN` |
| Custom endpoint | Your API key + base URL |

> API keys are stored **in memory only** — enter them each session, or set the corresponding environment variable on your system for persistence.

---

## Project layout

```
├── src/                  CLI source (TypeScript)
├── scripts/              Build scripts (Bun)
├── dist/                 Built CLI output (cli.mjs)
├── desktop/
│   ├── main/             Electron main process
│   ├── preload/          Context bridge
│   ├── renderer/         React frontend
│   └── electron-builder.yml
└── bin/                  CLI entry point
```

---

## Tech stack

- **CLI engine:** Modified Claude Code fork (TypeScript, Bun bundler)
- **Desktop:** Electron 34, React 19, Tailwind CSS 4, Zustand, Vite
- **Packaging:** electron-builder (NSIS for Windows, DMG for macOS)

---

## License

MIT — see [LICENSE](LICENSE).

Commercial use is permitted. See [COMMERCIAL.md](COMMERCIAL.md) for trademark notes.

---

## Security

Never commit API keys or `.env` files. See [SECURITY.md](SECURITY.md) to report vulnerabilities privately.

---

## Contributing

PRs and issues welcome. Open an issue first for large changes. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
