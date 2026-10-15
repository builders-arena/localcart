<p align="center">
  <strong>LocalCart</strong><br>
  <em>Give your AI a shopping cart.</em>
</p>

<p align="center">
  <a href="https://github.com/yourusername/localcart/actions"><img src="https://img.shields.io/github/actions/workflow/status/yourusername/localcart/ci.yml?branch=main&style=flat-square" alt="Build Status"></a>
  <a href="https://github.com/yourusername/localcart/releases/latest"><img src="https://img.shields.io/github/v/release/yourusername/localcart?style=flat-square" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
</p>

---

LocalCart is a **local-first** AI shopping agent. It lets a local LLM browse, compare, and purchase products on Amazon through a real browser session — without your data ever leaving your machine.

## Why LocalCart?

Most AI shopping tools send your browsing data, purchase history, and payment information through cloud APIs. LocalCart takes a different approach:

- **100% local.** The LLM, the bridge, and the browser all run on your machine. If you use a local model (Ollama, llama.cpp), nothing touches the internet except the browser talking to Amazon.
- **Your real session.** No fake accounts. LocalCart drives your own logged-in Chromium profile with human-like timing, scrolling, and mouse movements.
- **Human-in-the-loop.** The LLM can search, browse, and add to cart autonomously. But checkout and order placement are **blocked until you approve them** in the control panel.
- **PII never reaches the LLM.** Credit cards, addresses, and emails are redacted from the page data before the LLM sees it.

## Quick Start

```bash
# Option A: scaffolded project
npx create-localcart@latest

# Option B: from source
git clone https://github.com/yourusername/localcart
cd localcart
npm install
npm run bridge
```

This opens a Chromium window and starts the bridge. Log in to Amazon in the browser, then:

1. Open `http://localhost:7701` for the **control panel**.
2. Point your LLM at `http://localhost:7700/rpc` (JSON-RPC 2.0).
3. Approve or reject high-stakes actions from the control panel.

## Architecture

```
┌──────────┐   JSON-RPC    ┌──────────────┐   Playwright   ┌──────────┐
│ Local LLM│◄─────────────►│ LocalCart     │◄──────────────►│ Chromium │
│ (Ollama) │  localhost     │ Bridge       │   (your        │ (your    │
│          │  :7700         │              │    profile)     │ profile) │
└──────────┘                └──────┬───────┘                └────┬─────┘
                                   │                             │
                            ┌──────▼───────┐                     │ HTTPS
                            │ Control      │               ┌─────▼─────┐
                            │ Panel  :7701 │               │  Amazon   │
                            └──────────────┘               └───────────┘
```

**The LLM never sees raw HTML or PII.** It receives structured JSON summaries of products, prices, and cart contents.

## Security Model

| Layer | Enforcement |
|-------|-------------|
| **PII Redaction** | Pattern-matched before page data reaches the LLM |
| **Action Tiers** | Checkout/order = blocked until human approves |
| **Rate Limits** | Hard caps: 4 pages/min, 15 searches/hr, 3 checkouts/day |
| **Domain Allowlist** | Navigation outside configured domains is rejected |
| **CAPTCHA Handling** | Detected and surfaced for human resolution; never solved programmatically |

See [Security docs](docs/security.md) for the full model.

## CLI Flags

```
localcart [options]

  --headless              Run browser without visible window
  --port <n>              Bridge RPC port (default: 7700)
  --ui-port <n>           Control panel WebSocket port (default: 7701)
  --profile-path <dir>    Chrome user data directory
  --allowed-domains <d>   Comma-separated domain allowlist
  -v, --version           Print version
  -h, --help              Show help
```

## Supported Actions

| Action | Tier | Description |
|--------|------|-------------|
| `search` | Autonomous | Search for products |
| `view_product` | Autonomous | View a product page by ASIN |
| `add_to_cart` | Notify | Add a product to cart |
| `remove_from_cart` | Notify | Remove a product from cart |
| `update_quantity` | Notify | Change item quantity |
| `view_cart` | Autonomous | View current cart |
| `proceed_to_checkout` | **Gate** | Requires human approval |
| `place_order` | **Gate** | Requires human approval |
| `scroll` | Autonomous | Scroll the page |

## Project Structure

```
localcart/
├── app/                  # Next.js landing page & docs
├── bridge/               # The core bridge (runs locally)
│   ├── core/             # Session, sanitizer, rate limiter, HITL
│   ├── adapters/         # Retailer-specific selectors
│   ├── types/            # TypeScript types & Zod schemas
│   ├── ui/               # Control panel HTML
│   └── cli.ts            # CLI entry point
├── docs/                 # Markdown documentation
├── scripts/              # Build & packaging scripts
├── public/               # Static assets (demo, images)
└── vercel.json           # Vercel deployment config
```

## Contributing

See [Contributing guide](docs/contributing.md). Short version:

1. Fork, clone, `npm install`.
2. One feature or fix per PR.
3. TypeScript strict, no `any` without justification.
4. Adding a new retailer? Add an adapter in `bridge/adapters/`.

## Terms of Service Notice

LocalCart automates a browser session on the user's own machine and logged-in account. Users are responsible for compliance with the terms of service of any website they interact with. The built-in rate limiter and behavioral modeling are designed to keep usage patterns within reasonable human bounds, but users should review the relevant ToS themselves.

## License

[MIT](LICENSE)
