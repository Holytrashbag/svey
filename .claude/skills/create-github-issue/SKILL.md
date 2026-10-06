---
name: create-github-issue
description: Create, label, edit and close GitHub issues for Holytrashbag/svey with the gh CLI, using the backlog's title, label and body conventions. Use when asked to file/open/create an issue, bug report, feature request or backlog ticket, or to relabel or close one. Not for pull requests (use ship-pr).
---

File issues on `Holytrashbag/svey` with `gh`. Every issue follows the backlog conventions below so it can be picked up later with `/plan-ticket <number>`.

## 1. Check for duplicates

```bash
gh issue list --repo Holytrashbag/svey --search "<keywords>" --state all --limit 20
```

If an open issue already covers it, comment on that one instead (`gh issue comment <n> --body-file -`).

## 2. Title

A Conventional Commit, lower-case subject, imperative, describing the outcome. The same title becomes the PR title later:

- `fix(tracker): show the game timer only once`
- `feat(games): show survey and retire notes on the game recap`
- `docs: rewrite README around app features`

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`. Scope is the area touched (`tracker`, `games`, `game-setup`, `pods`, `decks`, `home`, `stats`, `auth`, `i18n`, `api`, `deps`, …).

## 3. Labels

Every issue gets **one type label + one `area:` label + one `priority:` label** (plus `accessibility` when it's a barrier for disabled users):

| Kind | Labels |
|---|---|
| Type | `bug`, `enhancement`, `documentation` |
| Area | `area: tracker` (live tracker), `area: games` (setup, survey, recap), `area: stats` (win rates, standings), `area: docs` (README, docs, Claude tooling) |
| Priority | `priority: high`, `priority: medium`, `priority: low` |
| Extra | `accessibility`, `good first issue`, `help wanted`, `question` |

`dependencies`, `javascript` and `autorelease: pending` are set by Dependabot and release-please — don't use them by hand. Labels change; check the live list when unsure:

```bash
gh label list --repo Holytrashbag/svey
```

If no `area:` label fits, ask the user whether to create one (`gh label create "area: decks" --color 0d9488 --description "…"`) rather than leaving it off.

## 4. Body

Use this structure (drop a section only if it would be empty):

```markdown
## Problem
What's wrong or missing, from the user's point of view. Concrete: which screen, what you see, why it matters.

## Scope
- Each bullet is one change the fix must make.
- Name the rule, not the implementation, unless the implementation is the point.

## Out of scope
- Related things this issue deliberately does not do.

## Open question
- Anything undecided. Give a proposed answer: "Proposed: yes, for consistency."

## Definition of done
- [ ] Observable, checkable outcomes (e.g. "Member with 3 wins in 4 games shows 75%")
- [ ] Tests that must exist for branching logic
- [ ] CI passes

## Pointers
- `apps/api/services/playgroup.service.ts` (what to look at there)
- `apps/frontend/src/views/PlaygroupDetailView.vue`
```

Look up the code before writing **Pointers** — real paths and symbols, not guesses.

## 5. Create it

Always pass the body via heredoc (no shell-quoting problems) and `--repo` explicitly:

```bash
gh issue create --repo Holytrashbag/svey \
  --title "fix(tracker): show the game timer only once" \
  --label "bug" --label "area: tracker" --label "priority: medium" \
  --body-file - <<'EOF'
## Problem
…
EOF
```

`gh issue create` prints the new issue URL; report it to the user.

## Other operations

```bash
gh issue view 39 --repo Holytrashbag/svey --comments
gh issue edit 39 --repo Holytrashbag/svey --add-label "priority: high" --remove-label "priority: medium"
gh issue edit 39 --repo Holytrashbag/svey --body-file - <<'EOF' … EOF
gh issue close 39 --repo Holytrashbag/svey --reason completed   # completed | "not planned" | duplicate
gh issue close 39 --repo Holytrashbag/svey --reason "not planned" --comment "Superseded by #41"
```

Issues are closed automatically when a PR whose body says `Closes #N` is merged, so don't close them by hand after shipping.

## Gotchas

- Issues are public (the repo is public). Never put personal data, secrets, server IPs or anything from `docs/private/` in a title, body or comment.
- `--project` needs the `project` token scope (`gh auth refresh -s project`); the backlog doesn't use Projects, so leave it off.
- `Could not resolve to a Repository` → you forgot `--repo Holytrashbag/svey` outside the repo.
