# Contributing

LocalCart is MIT-licensed and welcomes contributions.

## Development Setup

```bash
git clone https://github.com/yourusername/localcart
cd localcart
npm install
```

### Run the bridge in dev mode
```bash
npm run bridge
```

### Run the website in dev mode
```bash
npm run dev
```

### Type-check everything
```bash
npm run typecheck
```

## Adding a New Retailer

Each retailer gets its own adapter file in `bridge/adapters/`.

1. Create `bridge/adapters/<retailer>.ts`.
2. Export selector constants, robot-check detection, and restricted paths.
3. Add the retailer's domains to the default allowlist in `bridge/types/index.ts`.
4. Update the `classifyPage` function in `bridge/core/dom-sanitizer.ts` for the new site's URL patterns.
5. Add retailer-specific extraction functions (search results, product detail, cart).

## Code Style

- TypeScript strict mode.
- No `any` types without a comment explaining why.
- Prefer `async/await` over raw promises.
- No comments explaining *what* — only comments explaining *why*.

## Pull Requests

- One feature or fix per PR.
- Include a test plan in the PR description.
- Security-sensitive changes require a second reviewer.
