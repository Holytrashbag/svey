<!--
PR title = the commit on main after squash-merge, so make it a Conventional Commit:
  feat(tracker): persist life totals across reloads
  fix(api): return 413 for oversized avatars
See CONTRIBUTING.md for the full list of types.
-->

## What & why

<!-- What changes for users or developers, and why. Link the issue if there is one. -->

## How I tested it

<!-- Commands run, screens checked (phone width, EN + DE), edge cases. -->

## Checklist

- [ ] New or changed UI strings are in both `en` and `de`
- [ ] Schema changes ship as a new migration in `apps/api/db/migrations/` (it runs on deploy)
- [ ] Docs, `CONTRIBUTING.md` or `.claude/CLAUDE.md` updated if behaviour or conventions changed
