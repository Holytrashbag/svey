# frontend

Vue 3 single-page app for Svey, built with Vite and installable as a PWA. Setup lives in the [root README](../../README.md).

## Layout

| Path | Purpose |
|---|---|
| [`src/views/`](src/views) | Route-level pages ([`router/index.ts`](src/router/index.ts)) |
| [`src/components/`](src/components) | `ui/` primitives (`Sb*`), game setup (`Gs*`), game tracker (`Gt*`), and domain folders |
| [`src/stores/`](src/stores) | Pinia stores. They own server data plus loading and error state, and all HTTP goes through [`lib/api.ts`](src/lib/api.ts). |
| [`src/lib/`](src/lib) | Framework-free logic: game rules, relative-time bucketing, MTG colours, legal contact config |
| [`src/i18n/`](src/i18n) | vue-i18n setup and the `en`/`de` message files (`en` defines the typed schema) |

## Scripts

```sh
pnpm dev            # Vite dev server on :5173
pnpm test           # Vitest (single run); pnpm test:watch for watch mode
pnpm check-types    # vue-tsc
pnpm lint:check     # oxlint + ESLint (pnpm lint auto-fixes)
pnpm build          # type-check + production build
pnpm test:e2e       # Playwright end-to-end suite (e2e/); needs Postgres, see CONTRIBUTING.md
```

## Environment

See [`.env.example`](.env.example).

- `VITE_API_URL` points at the API origin.
- `VITE_LEGAL_*` fill the Impressum and privacy pages at build time. They show `[…]` placeholders when unset.
