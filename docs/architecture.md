# Architecture

## System Overview

LocalCart has three components, all running on your machine:

```
Local LLM  ←→  LocalCart Bridge  ←→  Chromium (your profile)
              (Node.js/TypeScript)
```

- **Local LLM**: Reasons about shopping tasks. Sees only sanitized page summaries.
- **Bridge**: Translates LLM commands into browser actions. Enforces all security policies.
- **Browser**: A real Chromium instance with your cookies and login session.

## Module Map

| Module | Path | Role |
|--------|------|------|
| Types & Validation | `bridge/types/` | Zod schemas, action tier classification |
| Session Manager | `bridge/core/session-manager.ts` | Browser lifecycle, action dispatch |
| DOM Sanitizer | `bridge/core/dom-sanitizer.ts` | PII redaction, page classification |
| Human-Like Engine | `bridge/core/human-like.ts` | Timing, mouse curves, scroll simulation |
| Rate Limiter | `bridge/core/rate-limiter.ts` | Sliding-window hard caps |
| HITL Gate | `bridge/core/hitl-gate.ts` | Three-tier approval system |
| Amazon Adapter | `bridge/adapters/amazon.ts` | Amazon-specific selectors and detection |
| CLI Entry Point | `bridge/cli.ts` | Argument parsing, server startup |

## Communication Protocol

The LLM communicates with the bridge via **JSON-RPC 2.0** over HTTP on localhost.

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "execute",
  "params": { "action": "search", "query": "wireless mouse" }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "status": "success",
    "pageState": {
      "url": "https://www.amazon.com/s?k=wireless+mouse",
      "pageType": "search_results",
      "items": [
        { "asin": "B0CX23V2ZK", "name": "Logitech M720", "price": "$49.99", "rating": "4.5★" }
      ],
      "notices": []
    }
  }
}
```

## State Machine

The bridge tracks its own state as a finite state machine:

```
IDLE → NAVIGATING → PAGE_READY → EXTRACTING → WAITING_FOR_LLM
                         │
                    CAPTCHA_DETECTED → HITL_WAITING → PAGE_READY
                         │
                    ERROR_RECOVERY → NAVIGATING
```

State is derived from the page after every action — never assumed.
