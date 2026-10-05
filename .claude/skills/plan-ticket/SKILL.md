---
name: plan-ticket
description: Fetch a GitHub issue by URL or number and produce a concrete implementation plan. Use when asked to plan, implement, or investigate a ticket, issue, or GitHub URL.
---

Fetch the specified GitHub issue and produce a phased implementation plan before writing any code.

## Usage

Invoke with a GitHub issue URL or issue number:

```
/plan-ticket https://github.com/Holytrashbag/svey/issues/11
/plan-ticket 11
```

## Steps

1. **Fetch the ticket**

   ```bash
   gh issue view <URL-or-number> --repo Holytrashbag/svey
   ```

   Read the full title, body, labels, and any comments. Parse out:
   - The problem being solved
   - Every explicit task / checklist item
   - Any files or areas mentioned

2. **Explore the codebase**

   Based on what the ticket mentions, read the relevant files. Typical areas:
   - `apps/api/routes/` and `apps/api/services/` for backend tasks
   - `apps/frontend/src/views/` and `apps/frontend/src/stores/` for frontend tasks
   - `apps/api/db/schema.ts` for DB changes
   - `apps/frontend/src/router/index.ts` for routing changes

   Use `grep` and `find` liberally to locate the exact files and line numbers the ticket touches. Do not guess — read the code.

3. **Produce the plan**

   Output a structured plan with these sections:

   ### Files to change
   List every file with a one-line description of what changes (create / modify / delete).

   ### Shared types / interfaces first
   If the work introduces new types (e.g. API response shapes, Zod schemas), define them before the implementation steps that consume them.

   ### Phased steps
   Number each step. Each step must be:
   - Atomic (one logical change)
   - Verifiable (what you check after completing it)
   - Sequenced (dependencies listed earlier than dependents)

   ### Verification
   The exact commands to run after implementation is complete:
   ```bash
   pnpm --filter frontend typecheck
   pnpm --filter api typecheck
   ```
   Add any manual steps (e.g. "navigate to /pods/:id/members and confirm the real member list loads").

   ### Open questions
   Any ambiguity or scope decision the ticket leaves unresolved. Do not proceed past this point without answering them — ask the user.

4. **Wait for approval**

   Present the plan and stop. Do NOT write any code until the user approves (or adjusts) the plan.

## Conventions to enforce

- `type` not `interface` for object shapes (per project conventions)
- No `any` — use `unknown` + narrowing
- All HTTP calls in stores, not components
- Backend business logic in `services/`, not route handlers
- DB schema changes require a migration (`pnpm --filter api db:generate`)
- Always use `pnpm`, never `npm` or `yarn`