---
name: ship-pr
description: Take finished changes in Holytrashbag/svey to an open pull request - branch from origin/main, commit, run the CI checks locally, push and `gh pr create` with a Conventional Commit title and the filled-in PR template. Use when asked to open/create/raise a PR, ship, push or "get this reviewed". Does not merge (merging deploys to production).
argument-hint: "[issue number] [--draft]"
---

Ship the current work as a PR that passes both required checks (**CI** and **Conventional PR title**) on the first try.

## Guardrails

- **Never commit or push to `main`.** It's protected; work always goes through a branch + PR.
- **Never merge** unless the user explicitly asks in this conversation. Merging squash-merges to `main` and **deploys to production**, including migrations.
- Never touch the release-please PR (`chore(main): release x.y.z`) — that's the `release` skill.
- Never `--no-verify`, never force-push a branch someone else is working on, never commit `.env*` (except `.env.example`/`.env.test`), `docs/private/` or personal data.

## 1. Check where you are

```bash
git status --short
git branch --show-current
git fetch origin
git log --oneline origin/main..HEAD
```

- On `main` (or a branch holding unrelated commits): create a fresh branch from `origin/main` and carry the working-tree changes over:
  ```bash
  git switch -c <type>/<short-slug> origin/main   # uncommitted changes come along
  ```
  If the changes conflict with `origin/main`, stop and tell the user.
- Branch prefixes match the change type: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/`.
- Look at every changed/untracked file. Only stage what belongs to this change; ask about anything surprising (e.g. a turbo-generated `AGENTS.md`, stray lockfile churn).

## 2. Commit

Branch commits are squashed on merge, so granular is fine. Stage explicit paths, not `git add -A`:

```bash
git add <paths>
git commit -F - <<'EOF'
feat(tracker): persist life totals across reloads

Optional body: why, not what.

Co-Authored-By: <the trailer from the session's attribution instructions>
EOF
```

## 3. Run CI locally

Exactly what the CI workflow runs (Node from `.nvmrc`):

```bash
pnpm lint:check && pnpm check-types && pnpm test && pnpm build
```

- If `pnpm install` changed `pnpm-lock.yaml` unexpectedly, find out why before committing it — CI uses `--frozen-lockfile`.
- On failure: fix it, commit, re-run. Don't open the PR with a known-red build. If a failure is pre-existing on `origin/main`, say so rather than fixing unrelated code silently.
- Docs/skill-only changes still run it — it's cheap insurance.

## 4. Title

The PR title becomes the commit on `main` and feeds release-please, so it **must** be a Conventional Commit with a lower-case, imperative subject:

| Title | Changelog / version |
|---|---|
| `feat(scope): …` | Features, minor bump |
| `fix(scope): …` | Bug Fixes, patch bump |
| `perf` / `refactor` / `revert` | listed, patch bump |
| `docs` / `test` / `build` / `ci` / `chore` | hidden, no bump |
| `feat!: …` | major bump — only with the user's OK |

Allowed types are exactly those ten. Scope = area touched (`tracker`, `games`, `pods`, `decks`, `stats`, `auth`, `i18n`, `api`, `deps`, …). If the work closes an issue, reuse its title.

## 5. Push and open the PR

```bash
git push -u origin HEAD
gh pr create --repo Holytrashbag/svey --base main \
  --title "fix(pods): base member win rate on games actually played" \
  --body-file - <<'EOF'
## What & why

<What changes for users or developers, and why.>

Closes #39

## How I tested it

- `pnpm lint:check && pnpm check-types && pnpm test && pnpm build` — green
- <manual checks: screens at 360px, EN + DE, edge cases>

## Checklist

- [x] New or changed UI strings are in both `en` and `de`
- [ ] Schema changes ship as a new migration in `apps/api/db/migrations/` (it runs on deploy)
- [x] Docs, `CONTRIBUTING.md` or `.claude/CLAUDE.md` updated if behaviour or conventions changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Body rules (from `.github/pull_request_template.md`):

- Keep the three headings. Tick a checklist item only if it's true; for items that don't apply, tick them and append "(n/a)" — don't delete them.
- `Closes #N` for each issue fully resolved (auto-closes on merge); `Refs #N` for partial work.
- "How I tested it" lists what was actually run — never claim a check you didn't do.
- A migration in the diff? Say so explicitly in "What & why": it runs on deploy.
- Add `--draft` when the user asks for a draft or the work is incomplete.

## 6. Watch the checks

```bash
gh pr checks --repo Holytrashbag/svey --watch
```

Report the PR URL and the check results. If a check fails, read the log (`gh run view <run-id> --log-failed`), fix, push again. Then stop — merging is the user's call.

## Merging (only when asked)

```bash
gh pr merge <n> --repo Holytrashbag/svey --squash --delete-branch
```

Squash is the only allowed method. Remind the user that this deploys to production.
