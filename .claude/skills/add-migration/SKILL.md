---
name: add-migration
description: Change the Svey Postgres schema safely - edit apps/api/db/schema.ts, draft the SQL diff with drizzle-kit, save it as the next numbered file in apps/api/db/migrations/, and apply it locally. Use whenever a task adds, drops, renames or alters a table, column, index, constraint or enum value, or asks for a "migration".
---

The schema has two sources that must agree:

- `apps/api/db/schema.ts` — Drizzle's TypeScript view, used by the code
- `apps/api/db/migrations/NNN_*.sql` — plain SQL, **the only thing that changes the database**. `db/migrate.ts` applies unapplied files in filename order, each in its own transaction, and records them in `_migrations`. In production it runs on container start, so **a migration goes live with the merge that contains it**.

## Rules

- **Never edit, rename or delete a migration that's on `main`.** Fix mistakes with a new migration.
- **Forward-only and additive.** For a moment the old app version runs against the new schema, so prefer new nullable columns / columns with defaults, and new tables. Dropping or renaming something in use takes two PRs: stop using it, then drop it.
- **Never `pnpm --filter api db:push`** and never hand-edit a database — that is exactly the drift this flow prevents.
- Better Auth tables (`user`, `session`, `oauth_account`, `verification`) are **not** in `schema.ts`; changes to them are hand-written SQL only (see `000_better_auth_schema.sql`, `006_user_terms_columns.sql`).
- Backfills belong in the same migration as the column they fill (plain `UPDATE`); keep them idempotent-safe and quick.

## Steps

### 1. Baseline draft (before touching `schema.ts`)

`db/drizzle/` is gitignored and usually empty, so `db:generate` on its own drafts the **whole** schema as `CREATE` statements. Create a snapshot of the current schema first, so the next generate yields only your change:

```bash
rm -rf apps/api/db/drizzle
pnpm --filter api db:generate      # writes db/drizzle/0000_*.sql + meta/ snapshot — ignore the SQL
```

No database is needed for `generate`.

### 2. Edit `apps/api/db/schema.ts`

Follow the existing style: `camelCase` exports, `snake_case` SQL names, enums as `xxxEnum = pgEnum('xxx', [...])`, relations at the bottom. Update `relations()` if you add a foreign key.

### 3. Draft the diff

```bash
pnpm --filter api db:generate      # writes db/drizzle/0001_*.sql — this is your change
cat apps/api/db/drizzle/0001_*.sql
```

Check the draft does exactly what you meant. drizzle-kit may ask interactively whether a column was renamed or dropped+added — in a non-interactive shell, hand-write that part instead. Watch for:

- `NOT NULL` without a default on an existing table — fails on non-empty tables. Add a default, or add nullable → backfill → set NOT NULL.
- Renames shown as `DROP` + `ADD` — data loss. Use `ALTER TABLE … RENAME COLUMN`.
- Enum changes: `ALTER TYPE … ADD VALUE` works in a transaction on Postgres 17, but the new value **can't be used in the same migration**. Put inserts/updates that use it in a later file.

### 4. Save it as the next migration

```bash
ls apps/api/db/migrations/    # find the highest NNN
```

Create `apps/api/db/migrations/<NNN+1>_<snake_case_summary>.sql` (three digits, e.g. `009_deck_scratch_note.sql`). Clean up the draft into the house style:

```sql
-- One or two lines on why this change exists and anything a reader of the
-- table needs to know (e.g. how old rows are treated).
ALTER TABLE deck ADD COLUMN scratch_note TEXT;
```

- Remove drizzle's `--> statement-breakpoint` markers and `"public".` prefixes; unquoted lower-case identifiers (quote only `"user"`).
- One migration per PR is the norm; combine related changes into one file.

Then throw the drafts away: `rm -rf apps/api/db/drizzle`.

### 5. Apply locally

```bash
pnpm db:up          # Postgres 17 in Docker
pnpm db:migrate     # should print "apply 009_…"
```

To prove it also works from scratch: `pnpm db:reset && pnpm db:migrate && pnpm --filter api seed`. If `db:migrate` fails, the file was rolled back — fix the SQL (it's not on `main` yet, so editing it is fine) and run again.

### 6. Update the code and check

- Use the column in services/routes; update `apps/frontend/src/types/api.ts` if it's exposed.
- Seed data (`apps/api/jobs/seed-demo.ts`) and GDPR erasure (`apps/api/services/account.service.ts`) — update them if the column holds user data.
- `pnpm lint:check && pnpm check-types && pnpm test && pnpm build`

### 7. Ship

In the PR (see `ship-pr`), tick the migration checklist item and say in "What & why" that the migration runs on deploy, and whether it's safe for the old app version.
