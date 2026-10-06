---
name: release
description: Check and cut a Svey version via the release-please PR (`chore(main): release x.y.z`) - review what's in it, then merge it with the admin bypass so it tags vX.Y.Z and publishes the GitHub release. Use when asked to release, cut/tag a version, ship a release, check "what's in the next release", or about the release-please PR. Not for normal feature PRs (use ship-pr).
---

Svey deploys on **every** merge to `main`; versions only document what shipped. release-please (`.github/workflows/release-please.yml`, config in `release-please-config.json`, current version in `.release-please-manifest.json`) keeps one release PR open and rewrites it after each merge to `main` with:

- new `CHANGELOG.md` entries, built from the squash-commit titles
- the version bump in `package.json`, `apps/api/package.json` and `apps/frontend/package.json`

Merging that PR tags `vX.Y.Z` and publishes the GitHub release.

## Guardrails

- **Only merge the release PR when the user explicitly asks to cut the release in this conversation.** "What's in the next release?" is a read-only request.
- Never edit the release PR branch, `CHANGELOG.md` or version numbers by hand — release-please owns them and will overwrite them.
- The merge is a push to `main`, so it also triggers a (no-op) production deploy. That's expected.

## 1. Find the release PR

```bash
gh pr list --repo Holytrashbag/svey --label "autorelease: pending" --state open \
  --json number,title,updatedAt
```

(Search by label, not title — GitHub search mangles `chore(main):`.)

None open → nothing releasable has merged since the last release (only hidden types like `chore`/`docs`/`ci` landed, or nothing). Say so and stop.

## 2. Review what's in it

```bash
gh pr view <n> --repo Holytrashbag/svey --json title,body,files -q '.title, .body, [.files[].path]'
git fetch origin --tags
git describe --tags --abbrev=0 origin/main          # last released tag, e.g. v1.0.0
git log --oneline <last-tag>..origin/main           # everything merged since
```

Check, and report to the user:

- **Version bump is right:** any `feat` → minor, only `fix`/`perf`/`refactor`/`revert` → patch, `!`/`BREAKING CHANGE` → major. Hidden types (`docs`, `test`, `build`, `ci`, `chore`) appear in the log but not in the changelog — that's expected.
- **Nothing missing:** every user-facing PR in the git log shows up in the changelog. A missing one usually means a mis-typed title (e.g. a fix merged as `chore:`).
- **PR is current:** it was updated after the latest merge to `main` (release-please runs on each push; give it a minute after a fresh merge).
- **Files touched:** only `CHANGELOG.md`, `.release-please-manifest.json` and the three `package.json` files.

Present a short summary: version, highlights grouped as Features / Bug Fixes, anything odd. If it's a read-only request, stop here.

## 3. Merge it (only when asked)

The release PR is opened with the workflow's built-in `GITHUB_TOKEN`, and GitHub doesn't run workflows for PRs created that way, so its required checks (**CI**, **Conventional PR title**) never report and it shows `BLOCKED`. Merge with the admin bypass — squash is the only allowed method:

```bash
gh pr merge <n> --repo Holytrashbag/svey --squash --admin
```

This is safe because the diff is only changelog and version numbers. Never use `--admin` on any other PR.

## 4. Verify

```bash
gh run list --repo Holytrashbag/svey --workflow release-please.yml --limit 1   # should succeed
gh release view --repo Holytrashbag/svey                                       # newest release: vX.Y.Z
git fetch origin --tags && git tag --sort=-v:refname | head -3
```

Report the release URL. The next merge to `main` opens a fresh release PR.

## Fixing a wrong version or changelog

- **Wrong bump / force a version:** merge a commit to `main` (via a normal PR) whose body has a `Release-As: x.y.z` footer; release-please re-cuts the PR with that version.
- **Missing or mis-worded entry:** release-please reads squash-commit titles, which can't be changed after merge. Edit the GitHub release notes after the release (`gh release edit vX.Y.Z --notes-file -`), or accept it and fix the PR-title habit going forward.
