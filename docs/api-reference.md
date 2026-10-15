# API Reference

## JSON-RPC Endpoint

**URL**: `http://127.0.0.1:7700/rpc` (configurable via `--port`)

All requests use JSON-RPC 2.0 over HTTP POST.

## Methods

### `execute`

Run a browser action. This is the primary method your LLM calls.

**Params**: An action object (see below).

**Returns**: `{ status, pageState?, error?, retryAfterMs? }`

### `navigate`

Navigate to a URL and return the page state.

**Params**: `{ url: string }`

### `get_state`

Return the bridge's current internal state without performing any action.

## Action Types

### `search`
```json
{ "action": "search", "query": "wireless mouse" }
```
Tier: **autonomous**

### `view_product`
```json
{ "action": "view_product", "asin": "B0CX23V2ZK" }
```
Tier: **autonomous**

### `add_to_cart`
```json
{ "action": "add_to_cart", "asin": "B0CX23V2ZK" }
```
Tier: **notify**

### `remove_from_cart`
```json
{ "action": "remove_from_cart", "asin": "B0CX23V2ZK" }
```
Tier: **notify**

### `update_quantity`
```json
{ "action": "update_quantity", "asin": "B0CX23V2ZK", "quantity": 2 }
```
Tier: **notify**

### `view_cart`
```json
{ "action": "view_cart" }
```
Tier: **autonomous**

### `proceed_to_checkout`
```json
{ "action": "proceed_to_checkout" }
```
Tier: **gate** — requires human approval

### `place_order`
```json
{ "action": "place_order" }
```
Tier: **gate** — requires human approval

### `scroll`
```json
{ "action": "scroll", "direction": "down", "amount": "medium" }
```
Tier: **autonomous**

### `get_page_state`
```json
{ "action": "get_page_state" }
```
Tier: **autonomous**

## Response Statuses

| Status | Meaning |
|--------|---------|
| `success` | Action completed, `pageState` contains the result |
| `error` | Something failed, `error` has details |
| `pending_approval` | Action needs human approval (gate tier) |
| `blocked` | Interstitial detected (CAPTCHA, 2FA), needs `human_intervention` |
| `rate_limited` | Rate limit hit, `retryAfterMs` says when to retry |
