---
name: plan-ticket
description: Fetch a Holytrashbag/svey GitHub issue by number or URL, read the code it points to, and produce a phased implementation plan for approval before writing code. Use when asked to plan, pick up or investigate an issue/ticket and review the plan before coding ("plan issue 33", "how would we do #39?", a github.com/.../issues/N link). To implement an issue autonomously (tests first, PR at the end), use implement-issue.
argument-hint: <issue number or URL>
---

Turn a backlog issue into a plan the user approves **before** any code is written.

## 1. Fetch the ticket

```bash
gh issue view <number-or-URL> --repo Holytrashbag/svey --json number,title,body,labels,comments,state
```

(The plain `gh issue view` output can come back empty in non-interactive shells; `--json` is reliable.)

Backlog issues follow a fixed structure (see the `create-github-issue` skill): **Problem**, **Scope**, **Out of scope**, **Open question**, **Definition of done**, **Pointers**. Extract:

- every Scope bullet and Definition-of-done checkbox — each must map to a plan step or a verification item
- the Pointers — start reading there
- Open questions — carry them into the plan, with the issue's proposed answer
- comments — they may change the scope

If the issue is closed, or an open PR already references it (`gh pr list --repo Holytrashbag/svey --search "<number>"`), tell the user before planning.

## 2. Read the code

Start from the Pointers, then follow the data flow end to end. Typical paths:

| Concern | Where |
|---|---|
| API endpoint | `apps/api/routes/<domain>/index.ts` → `apps/api/services/<domain>.service.ts` |
| DB tables | `apps/api/db/schema.ts`, `apps/api/db/migrations/*.sql` |
| API ↔ frontend types | `apps/frontend/src/types/api.ts` |
| Server data / actions | `apps/frontend/src/stores/use*Store.ts` |
| Screens | `apps/frontend/src/views/*View.vue`, `src/components/{ui,game-setup,game-tracker,…}` |
| Pure logic | `apps/frontend/src/lib/*.ts`, `apps/api/lib/*.ts` (+ colocated `*.test.ts`) |
| Copy | `apps/frontend/src/i18n/locales/{en,de}/*.json` |
| Routes | `apps/frontend/src/router/index.ts` |

Use `grep`/`find` to get exact files, symbols and line numbers. Don't guess — every file in the plan must have been opened.

## 3. Write the plan

### Files to change
Every file, with create / modify / delete and one line on what changes.

### Types and contracts first
New or changed API shapes, Zod schemas (`XxxSchema`, types via `z.infer`), `types/api.ts` entries and DB columns — before the steps that use them.

### Steps
Numbered, each one atomic, verifiable ("check: …") and ordered so dependencies come first. Usual order: migration → schema/service → route → frontend types → store → components → i18n → tests.

### Verification
Always the CI commands, plus targeted ones while iterating:

```bash
pnpm lint:check && pnpm check-types && pnpm test && pnpm build   # exactly what CI runs
pnpm --filter api test        # API unit/route tests (no DB needed)
pnpm --filter frontend test   # Vitest
```

Then manual checks tied to the Definition of done (e.g. "`pnpm dev`, open /pods/:id at 360px wide, member with 3/4 games shows 75%, check EN and DE").

### Open questions
Anything the ticket leaves undecided, each with a recommendation. Ask with `AskUserQuestion` when the answer changes the plan.

## 4. Stop for approval

Present the plan and **write no code** until the user approves or adjusts it. Then:

1. Branch from `origin/main` (`git fetch origin && git switch -c <type>/<slug> origin/main`), where `<type>` matches the issue title's type.
2. Implement step by step; use the `add-migration` skill for any schema change.
3. Ship with the `ship-pr` skill (PR body says `Closes #<number>`).

## Rules the plan must respect

From `.claude/CLAUDE.md` — call out any step that touches them:

- **Layering:** business logic and access checks (membership, ownership) live in `apps/api/services/`, not route handlers; never trust IDs from the request body.
- **Schema changes** only via a new numbered SQL file in `apps/api/db/migrations/` (forward-only, it runs on deploy) — never edit an applied one.
- **Multi-step writes** in `db.transaction()`; relational `.query.*` for reads, builder for writes/aggregates.
- **Errors:** throw `Errors.*` (`AppError`) for expected failures; let the rest bubble.
- **TypeScript:** strict, no `any`, `type` over `interface`, const-object enums; frontend has `noUncheckedIndexedAccess`.
- **Vue:** `<script setup>`, typed `defineProps`/`defineEmits`, one component per file (~200 lines max), Tailwind tokens only, fits 360px.
- **State/HTTP:** all HTTP through `lib/api.ts` from store actions; never `fetch` in components.
- **i18n:** every user-facing string through `t()`, keys in **both** `en` and `de` (informal "du").
- **Tests:** pure logic and branching rules get colocated tests.
- **Package manager:** `pnpm` only.
