---
name: create-github-issue
description: Create, label, and close GitHub issues using the gh CLI. Use when asked to create an issue, file a bug report, open a feature request, or track work in GitHub Issues.
---

Create GitHub issues for the `Holytrashbag/svey` repo using the `gh` CLI, which is pre-installed and authenticated (`gh auth status` confirms it). No build step needed — `gh` is the driver.

## Prerequisites

`gh` must be installed and authenticated:

```bash
gh --version    # gh version 2.93.0
gh auth status  # confirms logged in to github.com
```

## Create an issue

Minimal — title only (body defaults to empty):

```bash
gh issue create --title "fix: broken deck sync after Archidekt API change"
```

With body:

```bash
gh issue create \
  --title "feat: add poison counter display to game tracker" \
  --body "The game tracker doesn't show poison counters. Should display alongside life total."
```

With label (multiple `--label` flags or comma-separated):

```bash
gh issue create \
  --title "bug: commander damage not resetting on game end" \
  --body "Steps to reproduce: ..." \
  --label "bug"

gh issue create \
  --title "feat: dark mode toggle" \
  --label "enhancement,help wanted"
```

Multi-line body via stdin (useful for agents composing structured content):

```bash
gh issue create \
  --title "feat: bracket estimator improvements" \
  --body-file - << 'EOF'
## Problem
The bracket estimator doesn't account for stax pieces.

## Proposed solution
Add a weight multiplier for known stax cards in the estimator logic.

## Affected files
- apps/api/lib/bracket-estimator.ts
EOF
```

Assign to yourself:

```bash
gh issue create --title "chore: update dependencies" --assignee "@me"
```

## Available labels

```
bug             enhancement      documentation
good first issue  help wanted    duplicate
invalid         question         wontfix
```

List current labels at any time:

```bash
gh label list
```

## View and close issues

```bash
gh issue view 1                        # view issue #1
gh issue list --limit 10               # list open issues
gh issue close 1 --reason "completed"  # close with reason: completed | not_planned | duplicate
```

## Gotchas

- `--repo` flag overrides the detected repo: `gh issue create --repo owner/other-repo --title "..."`. Without it, `gh` uses the current git remote, which is `Holytrashbag/svey`.
- Body text with double quotes must be escaped or use `--body-file -` with a heredoc (shown above) to avoid shell quoting issues.
- The `project` scope is NOT in the current token — `--project` flag will fail with a 401. To fix: `gh auth refresh -s project`.
- `gh issue create` returns the new issue URL on stdout (e.g. `https://github.com/Holytrashbag/svey/issues/2`) — capture it with `$(gh issue create ...)` if you need the issue number.

## Troubleshooting

**`gh: command not found`** — install via the GitHub CLI apt repo or download the binary from https://cli.github.com. On this machine it's at `/usr/bin/gh`.

**`GraphQL: Resource not accessible by integration`** — the token is missing a scope. Run `gh auth refresh -s <scope>` where `<scope>` is the one mentioned in the error (e.g. `project`).

**`Could not resolve to a Repository`** — you're not inside a git repo, or the remote isn't set. Pass `--repo Holytrashbag/svey` explicitly.
