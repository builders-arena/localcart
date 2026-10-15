# Security Model

## Design Principle

Every security control is enforced at the **bridge level** — the layer between the LLM and the browser. The LLM has no direct access to the browser, the network, or your data. It can only issue structured commands through a validated schema.

## PII Redaction

Before any page data reaches the LLM, it passes through a three-stage sanitizer:

1. **Structural strip** — Remove scripts, styles, iframes, hidden elements, tracking pixels.
2. **PII pattern matching** — Credit card numbers, emails, phone numbers, SSNs, and ZIP codes are replaced with redacted tokens (e.g., `[CARD ••••]`).
3. **Semantic compression** — The cleaned DOM is converted to a structured JSON summary. The LLM never sees raw HTML.

Additionally, content inside known PII containers (`.payment-method-container`, `#address-book-entry`, etc.) is fully redacted regardless of format.

## Action Tiers

| Tier | Actions | Behavior |
|------|---------|----------|
| **Autonomous** | search, scroll, view product, get state | Execute immediately |
| **Notify** | add to cart, remove from cart, change qty | Execute + push notification |
| **Gate** | proceed to checkout, place order | **Block until human approves** |

The tier classification is hardcoded in the bridge. The LLM cannot reclassify an action.

## Rate Limiting

Hard-capped sliding windows prevent aggressive automation:

- 4 page navigations per minute
- 15 searches per hour
- 10 add-to-cart actions per hour
- 3 checkout attempts per day
- 2-hour maximum session duration

These are enforced before any browser interaction occurs. A rate-limited action returns an error to the LLM with a retry delay.

## Domain Allowlist

The bridge maintains a configurable list of allowed domains. Any navigation outside this list is blocked. By default, only `amazon.com` and `www.amazon.com` are allowed.

## What Never Leaves Your Machine

- Raw cookies and session tokens
- Payment instrument details
- Raw DOM content
- Browser fingerprint data
- Order history (unless explicitly requested and sanitized)

If you use a local LLM (Ollama, llama.cpp), **nothing leaves your machine at all**.
