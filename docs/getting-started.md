# Getting Started

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **A local LLM** — [Ollama](https://ollama.ai), llama.cpp, or any OpenAI-compatible local API
- **A logged-in Amazon session** — LocalCart uses your existing browser profile

## Installation

### Option A: npx (recommended)

```bash
npx create-localcart@latest
```

### Option B: Clone from source

```bash
git clone https://github.com/builders-arena/localcart
cd localcart
npm install
```

## Running the Bridge

```bash
npm run bridge
```

This launches:
- A **Chromium window** with your persistent browser profile
- The **Bridge RPC server** on `http://127.0.0.1:7700/rpc`
- The **Control Panel WebSocket** on `http://127.0.0.1:7701`

## First-Time Setup

1. When the browser opens, navigate to Amazon and log in manually.
2. Your session cookies are saved to `~/.localcart/browser-profile/` and persist across restarts.
3. Open `http://127.0.0.1:7701` in a separate browser tab to see the control panel.

## CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--headless` | `false` | Run browser without visible window |
| `--port <n>` | `7700` | Bridge RPC port |
| `--ui-port <n>` | `7701` | Control panel port |
| `--profile-path <dir>` | `~/.localcart/browser-profile` | Chrome user data directory |
| `--allowed-domains <d>` | `amazon.com,www.amazon.com` | Comma-separated domain allowlist |

## Connecting Your LLM

Point your LLM's tool-use or function-calling endpoint at the bridge. Example with curl:

```bash
curl -X POST http://127.0.0.1:7700/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "execute",
    "params": { "action": "search", "query": "USB-C cable 6ft" }
  }'
```

The bridge returns a sanitized JSON summary of the resulting page — product names, prices, ratings — with all PII redacted.
