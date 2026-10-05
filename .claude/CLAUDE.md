# Svey — Claude Code Rules

## Project Overview

**Svey** is a social/community app for Magic: The Gathering Commander playgroups: live game tracking on one shared phone, post-game surveys, deck management (Archidekt import) and stats. The aesthetic is a modern sports-stats app (jewel tones, near-black, rounded corners), **not** fantasy-kitsch. Voice: playful but functional, witty microcopy, zero fantasy clichés.

Monorepo managed with **Turborepo + pnpm**. Two workspaces, no shared packages:

- `apps/frontend` — Vue 3 + Vite SPA (PWA)
- `apps/api` — Fastify + TypeScript (files at the package root, no `src/`)

Types are defined where they're used (routes/services on the API, `src/types/api.ts` on the frontend); the DB schema lives in `apps/api/db/`.

---

## Workflow (GitHub flow)

- **Never commit or push to `main`** — it's protected (PR + green CI required, linear history). Every change goes on a branch from `origin/main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `refactor/…`, `test/…`, `ci/…`
- Branch commits can be granular; they're squashed away. Still end each with the `Co-Authored-By` trailer
- Open the PR with `gh pr create`; the **PR title must be a Conventional Commit** (`feat(tracker): …`, lower-case subject) — it becomes the commit on `main` and feeds the changelog. Fill in `.github/pull_request_template.md`
- Required checks: **CI** (`pnpm lint:check && pnpm check-types && pnpm test && pnpm build`) and **Conventional PR title**. Run CI locally before pushing
- Merge with `gh pr merge --squash` only when the user asks — **merging deploys to production** (migrations included)
- Don't merge the release-please PR (`chore(main): release x.y.z`) unless asked; it cuts a version
- Details: [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Commands

Run from the **repo root**:

- `pnpm dev` — API (watch) + frontend (Vite)
- `pnpm lint:check` · `pnpm check-types` · `pnpm test` · `pnpm build` — exactly what CI runs
- `pnpm db:up` / `db:down` / `db:reset` — local Postgres in Docker
- `pnpm db:migrate` — apply SQL migrations
- `pnpm --filter api seed` — demo data (sign in as `demo@example.com` / `svey-demo`)

Per-package scripts are fine for one-off tasks: `pnpm --filter api test`, `pnpm --filter frontend lint`.

---

## TypeScript

- **Strict mode everywhere.** The frontend additionally uses `noUncheckedIndexedAccess`: narrow index lookups with real guards; only use `!` where a value is provably present
- No `any`. Use `unknown` and narrow, or define a proper type
- Prefer `type` over `interface` for object shapes; use `interface` only when extension/declaration merging is needed
- Infer types from Zod schemas via `z.infer<typeof Schema>` where a schema exists — do not duplicate type definitions
- Use discriminated unions for domain state
- Enums as `const` objects with a union type:
  ```ts
  export const DeathCause = {
    LIFE: "life",
    CMDR_DMG: "cmdr_dmg",
    POISON: "poison",
    CONCEDED: "conceded",
    SPECIAL: "special",
    NONE: "none",
  } as const;
  export type DeathCause = (typeof DeathCause)[keyof typeof DeathCause];
  ```

---

## Backend (`apps/api` — Fastify)

### Structure

```
apps/api/
├── server.ts             # Fastify instance + listen
├── app.ts                # Zod validator/serializer; autoloads plugins/ (root) and routes/ (under /api)
├── drizzle.config.ts
├── db/
│   ├── schema.ts         # Drizzle tables, enums, relations (app tables only)
│   ├── migrate.ts        # Applies db/migrations/*.sql in filename order
│   └── migrations/       # Plain SQL — the only way to change the schema
├── lib/                  # auth (Better Auth), db, env (Zod), errors, require-auth,
│                         # archidekt, scryfall, token-crypto, bracket-estimator, email, constants
├── plugins/              # cors, error-handler, uploads, scheduled-jobs (nightly cleanup)
├── routes/               # auth.ts, root.ts (/api/health), cards/, decks/, games/,
│                         # notifications/, playgroups/, users/ — each folder has index.ts
├── services/             # account, cleanup, deck, game, notification, playgroup, stats
├── jobs/                 # seed-demo, cleanup-orphans, encrypt-tokens (one-off scripts)
└── test/                 # helper.ts + app-level route/plugin tests
```

All routes are served under the `/api` prefix (single origin with the SPA in production).

### Error Handling

Custom `AppError` + Fastify's global error handler ([plugins/error-handler.ts](../apps/api/plugins/error-handler.ts)):

```ts
export const Errors = {
  notFound:     (msg: string) => new AppError(404, 'NOT_FOUND', msg),
  unauthorized: (msg: string) => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden:    (msg: string) => new AppError(403, 'FORBIDDEN', msg),
  badRequest:   (msg: string) => new AppError(400, 'BAD_REQUEST', msg),
  conflict:     (msg: string) => new AppError(409, 'CONFLICT', msg),
}
```

- **Throw `AppError` for domain/validation errors** (known, expected failures)
- Framework 4xx errors (validation, malformed JSON, upload limits) keep their status
- **Let unexpected errors bubble** — the handler logs them and returns a generic 500; never expose raw messages or stack traces
- Every error response (including unknown routes) has the shape `{ error: { code, message } }`

### Route Handlers

- Validate body/params/query with inline Zod schemas via `fastify-type-provider-zod`
- Keep handlers thin — delegate to `services/`
- Explicit status codes; `201` for creates, `204` for empty responses

### Authorization

- `requireAuth` (preHandler) puts the user on `request.user`
- **Access checks live in services**, not routes: playgroup-scoped reads/writes must verify membership (e.g. `assertPlaygroupMember` in `game.service.ts`, the caller/admin checks in `playgroup.service.ts`); deck reads check ownership
- Never trust IDs from the body: e.g. `createGame` verifies that every seated member belongs to the target playgroup

### Database (Drizzle ORM)

- Schema in `apps/api/db/schema.ts`; Better Auth tables (`user`, `session`, `oauth_account`, `verification`) are not in it — use a local `pgTable` handle when a script needs them (see `jobs/encrypt-tokens.ts`)
- **Relational query API (`.query.*`) for reads that need relations; SQL-like builder for writes, upserts and aggregations**
- Always use `db.transaction()` for multi-step writes
- No raw SQL strings unless there is no Drizzle alternative
- Schema changes: add the next numbered file in `db/migrations/` (`pnpm --filter api db:generate` drafts SQL into `db/drizzle/` to copy from). Never edit an applied migration; never mutate the DB manually

### Auth (Better Auth)

- Config in `apps/api/lib/auth.ts`: Discord + Google OAuth, email/password with required verification and reset
- Database hooks encrypt OAuth tokens at rest (`lib/token-crypto.ts`) and stamp the accepted terms version on sign-up
- Account deletion runs `deleteAccountData` (GDPR erasure/anonymisation) before Better Auth removes the user
- `playgroupMember.userId` may be null for pending invited members — always handle this case
- Guest players have only a `guestName` on `game_player` — no auth

---

## Frontend (`apps/frontend` — Vue 3)

### Component Rules

- **Always `<script setup>` with the Composition API** — no Options API, no `defineComponent`
- **One component per file.** Split when a component grows past ~200 lines
- Filenames `PascalCase.vue`; primitives use the `Sb` prefix (`SbButton.vue`), game setup `Gs`, game tracker `Gt`
- Props typed with `defineProps<{}>()`; emits typed with `defineEmits<{}>()`
- `defineModel()` for two-way binding in form components
- Bottom sheets stay mounted when closed: bind `:inert="!open"` so they leave the tab order and accessibility tree

### File Structure

```
apps/frontend/src/
├── components/
│   ├── ui/            # Sb* primitives
│   ├── auth/ decks/ home/ legal/ playgroups/
│   ├── game-setup/    # Gs*
│   └── game-tracker/  # Gt*
├── composables/       # useFormat (locale-aware dates/relative time), useNav, usePlaygroupStats, …
├── i18n/              # vue-i18n setup, formats, locales/{en,de}/*.json
├── lib/               # api.ts (fetch wrapper), auth-client.ts, game-tracker.ts, game-setup.ts,
│                      # time.ts, mtg.ts, legal-contact.ts — framework-free, unit-testable
├── router/index.ts
├── stores/            # useCardStore, useDeckStore, useGameStore, useLocaleStore,
│                      # useNotificationStore, usePlaygroupStore, useProfileStore
├── types/api.ts       # API response/request types
└── views/             # Route-level pages
```

### State & API

- Pinia stores own server data and domain UI state; async work happens in actions, which also own `loading`/`error`
- Use `$patch` for partial updates; derived values go in getters, not state
- **All HTTP goes through `lib/api.ts`** (`credentials: 'include'`, base URL from `VITE_API_URL`) — never raw `fetch` in a component

### i18n

- **Every user-facing string goes through `t()`** (or `<i18n-t>` for markup inside a sentence), including `aria-label`/`placeholder`
- Add each key to **both** `locales/en/*.json` and `locales/de/*.json`; `en` defines the typed schema and `src/i18n/messages.test.ts` fails on missing keys, mismatched `{params}` or empty strings
- German copy uses informal "du"; "Playgroup" and "Pod" stay untranslated
- Pure helpers return i18n keys/tokens (see `deathCauseKey`, `relDeath`, `relativeTimeToken`), not display strings
- Legal page bodies (Impressum, Datenschutz, Terms) are German-only by design; operator contact details come from `VITE_LEGAL_*` build-time env vars, never hard-coded

### Tailwind CSS

- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.ts`); design tokens are `@theme` colors in `src/style.css`: surfaces `bg-0…3`, text `fg-0…4`, accents `arcane` (purple), `tide` (teal), `crown` (gold), status `success`/`warning`/`danger`, mana `mtg-w/u/b/r/g/c`, plus `divider`/`overlay-*`/`scrim` — use these, not raw hex
- Tailwind only — no `<style scoped>` except for animations or third-party overrides
- `rounded-xl`/`rounded-2xl` for cards, `rounded-full` for badges/pills; `transition-*` utilities for interactive states
- Dark mode is the **default and only** mode
- Extract repeated class combinations into a component, not an `@apply` block
- Layouts must fit a 360px-wide phone

### Router

Routes live in `apps/frontend/src/router/index.ts`; playgroups use the `/pods` prefix. Guards call `authClient.getSession()` (`requiresAuth` → `/auth`, `guestOnly` → `/home`). Legal pages (`/impressum`, `/datenschutz`, `/terms`) and `/reset-password` are public.

---

## Game Session (critical flow)

- **Single-device flow** — one phone in the center of the table; no multi-device sync
- Setup (`GameSetupView`) writes the seats to `localStorage` (`svey:game-session`); the tracker runs fully client-side
- Tracker state is currently **in memory only** — persisting it after each change and offering a resume is a known gap
- Commander damage per player: `cmdrDmg: Record<attackerSeatIdx, number>`
- `autoDeath` (`lib/game-tracker.ts`) runs after every mutation: life ≤ 0, poison ≥ 10, or ≥ 21 damage from a **single** commander
- Manual elimination for card effects; concede (multiselect reasons) drops one player
- **End game** (last player standing) → survey → `POST /api/games` with `endReason: 'won'`
- **Retire** → survey → saved with `endReason: 'abandoned'` + `abandonReasons`; **Cancel** → nothing is saved
- After a successful POST, clear both localStorage keys

## Post-Game Survey

The phone is passed around; each player answers individually (skippable): fun rating (1–5), agency rating (1–5), free text. Results feed deck and playgroup stats.

---

## Domain Rules

- **Decks** are owned by a user, not a playgroup, and can be borrowed at the table (counts toward the pilot's record)
- Archidekt sync is one-way and manual (`POST /api/decks/:id/sync`); if a deck is gone upstream, set `archidektDeleted = true` and notify — never auto-delete
- Bracket (1–5) is estimated from card salt scores (`lib/bracket-estimator.ts`) unless Archidekt provides one; users can set `bracketOverride`
- `decklist_card.scryfall_id` holds Scryfall's **oracle_id**; card art is proxied and cached by the API (`lib/scryfall.ts`) and the illustrator must be credited wherever art is shown
- Stats (`stats.service.ts`) are scoped to a playgroup (visible to members) or cross-playgroup (private to the deck owner)
- Notifications store `params`; the client renders localized copy from `type` + `params` (stored `title`/`body` are English fallbacks)

## Database Schema (key tables)

- `playgroup` (`inviteCode`), `playgroup_member` (`role: admin|member`, `isPending`, nullable `userId`)
- `deck`, `decklist_card` (`isCommander`)
- `game` (`endReason: won|draw|abandoned`, `abandonReasons`), `game_player` (`deathCause`, `guestName` for guests), `survey_response`
- `notification` (`type`, `params`)
- `game_decklist_card` and `commander_damage` exist in the schema but are **not written yet**

---

## Testing

- API: Node's built-in runner (`node --experimental-strip-types --test`), env from the committed `apps/api/.env.test`; no database
- Frontend: **Vitest** (+ Vue Test Utils for components)
- Unit tests colocate with source (`lib/time.test.ts` next to `lib/time.ts`); API app-level tests live in `apps/api/test/`
- Test pure logic and anything with branching rules; no test needed for thin route handlers or trivial getters

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Vue components | PascalCase | `DeckDetailHero.vue` |
| Primitive / setup / tracker components | `Sb` / `Gs` / `Gt` prefix | `SbButton.vue`, `GsSeatCard.vue`, `GtPlayerTile.vue` |
| Pinia stores | `useXxxStore` | `useDeckStore.ts` |
| API route files | domain folder + `index.ts` | `routes/decks/index.ts` |
| Zod schemas | `XxxSchema` | `CreateGameSchema` |
| DB table names (Postgres) | `snake_case` | `playgroup_member` |
| Drizzle schema exports | `camelCase` | `export const playgroupMember = pgTable(...)` |
| DB enum exports | `camelCase` + `Enum` | `playgroupMemberRoleEnum` |
| Constants/enums | `SCREAMING_SNAKE_CASE` keys | `DeathCause.LIFE` |
| Environment vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |

---

## Things to Never Do

- Never put business logic or access checks in route handlers — they belong in `services/`
- Never use `any`
- Never use the Options API or `defineComponent`
- Never add `<style scoped>` unless Tailwind genuinely can't do it
- Never mutate Pinia state outside `$patch` or actions; never `fetch` from a component
- Never hard-code user-facing strings — use `t()`
- Never commit `.env` files, personal data, or anything under `docs/private/` — use `.env.example` placeholders
- Never change the DB schema except through a new migration
- Use plain ASCII quotes in `.vue`/`.ts` source — curly quotes break the parsers (fine inside locale JSON)
