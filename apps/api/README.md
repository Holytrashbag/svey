# api

Fastify REST API for Svey. All endpoints are served under `/api`. Setup lives in the [root README](../../README.md).

## Layout

| Path | Purpose |
|---|---|
| [`server.ts`](server.ts) / [`app.ts`](app.ts) | Bootstrap; autoloads `plugins/` at the root and `routes/` under `/api` |
| [`routes/`](routes) | One folder per domain. Handlers are thin: a Zod schema, a service call, a status code. |
| [`services/`](services) | Business logic as plain functions that receive a `Db` handle; authorization checks live here |
| [`lib/`](lib) | Better Auth config, DB client, Zod-validated env, Archidekt/Scryfall clients, token crypto, errors |
| [`plugins/`](plugins) | CORS, the global error handler, avatar uploads, nightly cleanup job |
| [`db/schema.ts`](db/schema.ts) | Drizzle schema for the app tables (auth tables are owned by Better Auth) |
| [`db/migrations/`](db/migrations) | Plain SQL migrations, applied in filename order by [`db/migrate.ts`](db/migrate.ts) |
| [`jobs/`](jobs) | One-off scripts: demo seed, orphan cleanup, OAuth-token encryption backfill |

## Scripts

```sh
pnpm dev            # watch mode (loads .env)
pnpm test           # node:test, reads the committed .env.test (no database needed)
pnpm check-types    # tsc --noEmit
pnpm build          # compile to dist/ (tests excluded)

pnpm migrate        # apply pending SQL migrations
pnpm seed           # demo users, decks, playgroups and games
pnpm db:generate    # draft SQL for schema.ts changes into db/drizzle/ → copy into db/migrations/
pnpm db:studio      # Drizzle Studio
```

## Conventions

- Throw `Errors.*` from [`lib/errors.ts`](lib/errors.ts) for expected failures. Anything else becomes a generic 500. The error handler always responds with `{ error: { code, message } }`.
- Schema changes go through a new numbered file in `db/migrations/`. Never edit an applied migration.
- Tests sit next to the code they cover (`lib/*.test.ts`). App-level route and plugin tests live in `test/`.
