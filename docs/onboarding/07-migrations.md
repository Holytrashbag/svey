# Module 7: Migrations

**Duration:** 40 min · **Level:** Intermediate · **Prerequisites:** [Module 6](06-database-schema.md)

A migration in Svey goes live the moment its PR is merged. That makes schema changes the highest-stakes routine work in the codebase. This module explains the runner, the rules, and the step-by-step workflow from the `add-migration` skill.

## Learning objectives

After this module you can:

- Explain how `db/migrate.ts` decides what to run, and what happens on failure.
- Describe when migrations run in development and in production.
- Apply the forward-only, additive rules, including the two-PR pattern for drops and renames.
- Use drizzle-kit to draft a migration without generating the whole schema.
- Avoid the classic traps: `NOT NULL` without a default, renames as drop+add, using a new enum value in the same file.

---

## Unit 1: The runner

[`apps/api/db/migrate.ts`](../../apps/api/db/migrate.ts) is about 50 lines. Read it in full; here's the core:

```ts
await client.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`)

const applied = new Set((await client.query('SELECT filename FROM _migrations')).rows.map(r => r.filename))

const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort()

for (const file of files) {
  if (applied.has(file)) { console.log(`skip  ${file}`); continue }
  const sql = await readFile(path.join(migrationsDir, file), 'utf8')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
    await client.query('COMMIT')
    console.log(`apply ${file}`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}
```

Key properties:

| Property | Consequence |
|---|---|
| Identity is the **filename** | Renaming an applied file makes it run *again*. Never rename or edit a shipped migration |
| Files run in **lexical order** | Always three-digit prefixes: `009_…` sorts before `010_…`, whereas `9_…` would sort after `10_…` |
| **One transaction per file** | A failing file leaves no partial change, and later files don't run. Fix it and rerun |
| No "down" migrations | Undo = a new forward migration |
| No checksum | The runner can't detect an edited file; review and the rules have to |

Statements that can't run inside a transaction (e.g. `CREATE INDEX CONCURRENTLY`) won't work with this runner. At Svey's data size a plain `CREATE INDEX` is fine.

---

## Unit 2: When migrations run

| Environment | Trigger |
|---|---|
| Local | You run `pnpm db:migrate` (`node --env-file=.env --experimental-strip-types db/migrate.ts`) |
| Production | Every API container start. [`docker-entrypoint.sh`](../../apps/api/docker-entrypoint.sh): `node dist/db/migrate.js` then `exec node dist/server.js` |

`tsc` only compiles `.ts`, so the [API Dockerfile](../../apps/api/Dockerfile) copies the SQL next to the compiled runner:

```dockerfile
RUN cp -r /app/db/migrations /app/dist/db/migrations
```

**The deployment window.** During `docker compose up -d`, the new container migrates the database and then starts. For a short time the schema is new while the previous version may still be serving, and if you roll back by reverting the PR, the *old* code runs against the *new* schema. Every migration must therefore be compatible with the app version before it.

---

## Unit 3: The rules

From the [`add-migration`](../../.claude/skills/add-migration/SKILL.md) skill and [CONTRIBUTING.md](../../CONTRIBUTING.md):

1. **Never edit, rename or delete a migration that's on `main`.** Fix mistakes with a new one.
2. **Forward-only and additive.** Prefer new nullable columns, columns with defaults, and new tables.
3. **Drops and renames take two PRs** (expand/contract): first stop using the column and ship that, then drop it in a later PR.
4. **Never `pnpm --filter api db:push`** and never hand-edit a database. That's the drift this flow prevents.
5. **Better Auth tables** (`user`, `session`, `oauth_account`, `verification`) aren't in `schema.ts`: changes to them are hand-written SQL (see `006_user_terms_columns.sql`).
6. **Backfills go in the same migration** as the column they fill, as a quick idempotent-safe `UPDATE`.
7. **One migration per PR** is the norm.

### Traps

| Trap | Why it bites | Do instead |
|---|---|---|
| `ADD COLUMN x INT NOT NULL` on a table with rows | Fails: existing rows have no value | Add a default, or add nullable → backfill → `SET NOT NULL` |
| drizzle-kit shows a rename as `DROP` + `ADD` | Data loss | Write `ALTER TABLE … RENAME COLUMN` by hand (and remember rule 3) |
| `ALTER TYPE … ADD VALUE 'x'` then using `'x'` in the same file | Postgres won't let a new enum value be used in the transaction that added it | Put inserts/updates using it in the next file |
| Editing a migration after merge | Production already applied the old text; local and prod diverge silently | New migration |

### A worked example: adding a required column to a live table

[`004_playgroup_invite_code.sql`](../../apps/api/db/migrations/004_playgroup_invite_code.sql) adds a `NOT NULL UNIQUE` column to a table that already had rows, safely:

```sql
-- 1. Add with a temporary default so existing rows satisfy NOT NULL
ALTER TABLE playgroup ADD COLUMN IF NOT EXISTS invite_code TEXT NOT NULL DEFAULT '';
-- 2. Backfill real values for existing rows
UPDATE playgroup SET invite_code = 'SPELL-' || upper(substring(md5(id::text), 1, 4)) || '-' || lpad((floor(random() * 100))::int::text, 2, '0') WHERE invite_code = '';
-- 3. Remove the temporary default so new rows must provide a code
ALTER TABLE playgroup ALTER COLUMN invite_code DROP DEFAULT;
-- 4. Enforce uniqueness only after the backfill
CREATE UNIQUE INDEX IF NOT EXISTS playgroup_invite_code_unique ON playgroup (invite_code);
```

And [`006_user_terms_columns.sql`](../../apps/api/db/migrations/006_user_terms_columns.sql) shows the opposite choice: the new consent columns stay **nullable** on purpose, because existing users have no consent record and fabricating one would be wrong. The comment at the top says so. Write that kind of comment.

---

## Unit 4: The workflow, step by step

`db/drizzle/` is gitignored and normally empty. If you run `db:generate` with no baseline, drizzle-kit drafts the *entire* schema as `CREATE` statements. The trick is to snapshot first.

```sh
# 1. Baseline snapshot of the current schema (ignore this SQL)
rm -rf apps/api/db/drizzle
pnpm --filter api db:generate          # writes db/drizzle/0000_*.sql + meta/ snapshot

# 2. Edit apps/api/db/schema.ts
#    camelCase exports, snake_case SQL names, enums as xxxEnum = pgEnum('xxx', [...]),
#    relations at the bottom; update relations() if you add a foreign key

# 3. Draft the diff
pnpm --filter api db:generate          # writes db/drizzle/0001_*.sql: your change
cat apps/api/db/drizzle/0001_*.sql

# 4. Save as the next numbered migration, in house style
ls apps/api/db/migrations/             # find the highest NNN
$EDITOR apps/api/db/migrations/009_<snake_case_summary>.sql
rm -rf apps/api/db/drizzle

# 5. Apply locally, and prove it works from scratch
pnpm db:migrate                        # prints "apply 009_…"
pnpm db:reset && pnpm db:migrate && pnpm --filter api seed
```

House style for the SQL file:

```sql
-- One or two lines on why this change exists and anything a reader of the
-- table needs to know (e.g. how old rows are treated).
ALTER TABLE deck ADD COLUMN scratch_note TEXT;
```

- Remove drizzle's `--> statement-breakpoint` markers and `"public".` prefixes.
- Unquoted lower-case identifiers. Quote only `"user"`.

**`generate` needs no database**; it diffs `schema.ts` against the snapshot. If drizzle-kit asks interactively whether a column was renamed, answer it, or hand-write that part.

### 6. Finish the change

A migration is rarely the whole PR. Check each of these:

- [ ] Services and routes use the new column; Zod schemas updated if it's input.
- [ ] [`apps/frontend/src/types/api.ts`](../../apps/frontend/src/types/api.ts) updated if the API exposes it.
- [ ] [`jobs/seed-demo.ts`](../../apps/api/jobs/seed-demo.ts) produces sensible values.
- [ ] If the column holds **personal data**: [`services/account.service.ts`](../../apps/api/services/account.service.ts) erases or anonymises it on account deletion (Module 8).
- [ ] The PR template's "Schema changes ship as a new migration" box is ticked.

If `db:migrate` fails locally, the file was rolled back. It's not on `main` yet, so editing it is fine. Fix and rerun.

---

## Summary

- The runner applies unapplied `.sql` files in filename order, each in a transaction, and records the filename in `_migrations`.
- Production migrates on every container start, so a migration ships with its merge.
- Forward-only, additive, never edit shipped files; drops and renames take two PRs.
- Use a drizzle-kit baseline snapshot to draft only your diff, then hand-curate the SQL.

## Knowledge check

**1. You notice a typo in a comment inside `007_notifications.sql` (already on `main`). What do you do?**

- A) Fix the comment; comments don't affect the schema
- B) Leave it, or add a new migration if the fix matters. Never edit a shipped file
- C) Rename the file to `007_notifications_v2.sql`
- D) Delete the row from `_migrations` and rerun

<details><summary>Answer</summary>

**B.** Editing shipped migrations is forbidden, comments included, so history stays trustworthy. Renaming would make it run again in every environment.
</details>

**2. You need a new `NOT NULL` column `deck.format` on a table with thousands of rows. Which migration is safe?**

- A) `ALTER TABLE deck ADD COLUMN format TEXT NOT NULL;`
- B) `ALTER TABLE deck ADD COLUMN format TEXT NOT NULL DEFAULT 'commander';`
- C) Edit `001_initial_schema.sql`
- D) `pnpm --filter api db:push`

<details><summary>Answer</summary>

**B.** Existing rows get the default. (A) fails on non-empty tables; (C) and (D) break the rules.
</details>

**3. Your migration adds `'game_saved'` to `notification_type` and inserts a welcome notification of that type in the same file. What happens?**

- A) Works fine
- B) Fails: a new enum value can't be used in the transaction that added it. Split it into two files
- C) Postgres ignores the insert
- D) It works only on an empty database

<details><summary>Answer</summary>

**B.** Each file runs in one transaction, so the usage must move to the next migration file.
</details>

**4. You want to rename `deck.name` to `deck.title`. What's the plan?**

- A) One migration with `RENAME COLUMN`, and the code change in the same PR
- B) Expand/contract: add `title` (backfilled) and switch the code to it; drop `name` in a later PR once nothing uses it
- C) Drop and re-add the column
- D) Use `db:push` locally and in production

<details><summary>Answer</summary>

**B.** During deploy and after a revert, the old code still expects `name`. A rename in one step breaks it.
</details>

**5. You run `pnpm --filter api db:generate` on a fresh clone without a baseline. What do you get?**

- A) An empty diff
- B) A draft that creates the entire schema
- C) An error: no database
- D) Your pending changes only

<details><summary>Answer</summary>

**B.** With no snapshot in `db/drizzle/`, drizzle-kit diffs against nothing. Generate a baseline first, then edit `schema.ts`, then generate again.
</details>

---

**Next:** [Module 8: Authentication and privacy →](08-auth-and-privacy.md)
