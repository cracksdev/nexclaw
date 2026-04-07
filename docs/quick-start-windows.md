# NexClaw Quick Start for Windows

This guide uses Windows PowerShell.

## 1. Install Node.js

Install Node.js 20 or newer from:

- `https://nodejs.org/`

Then open PowerShell and check it:

```powershell
node --version
npm --version
```

## 2. Install NexClaw

```powershell
npm install -g @gitlawb/nexclaw
```

## 3. Pick One Provider

### Option A: OpenAI

Replace `sk-your-key-here` with your real key.

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-your-key-here"
$env:OPENAI_MODEL="gpt-4o"

nexclaw
```

### Option B: DeepSeek

```powershell
$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_API_KEY="sk-your-key-here"
$env:OPENAI_BASE_URL="https://api.deepseek.com/v1"
$env:OPENAI_MODEL="deepseek-chat"

nexclaw
```

### Option C: Ollama

Install Ollama first from:

- `https://ollama.com/download/windows`

Then run:

```powershell
ollama pull llama3.1:8b

$env:CLAUDE_CODE_USE_OPENAI="1"
$env:OPENAI_BASE_URL="http://localhost:11434/v1"
$env:OPENAI_MODEL="llama3.1:8b"

nexclaw
```

No API key is needed for Ollama local models.

## 4. If `nexclaw` Is Not Found

Close PowerShell, open a new one, and try again:

```powershell
nexclaw
```

## 5. If Your Provider Fails

Check the basics:

### For OpenAI or DeepSeek

- make sure the key is real
- make sure you copied it fully

### For Ollama

- make sure Ollama is installed
- make sure Ollama is running
- make sure the model was pulled successfully

## 6. Updating NexClaw

```powershell
npm install -g @gitlawb/nexclaw@latest
```

## 7. Uninstalling NexClaw

```powershell
npm uninstall -g @gitlawb/nexclaw
```

## Need Advanced Setup?

Use:

- [Advanced Setup](advanced-setup.md)
