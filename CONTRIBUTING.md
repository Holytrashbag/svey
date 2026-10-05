# Contributing

Svey follows **GitHub flow**: `main` is always deployable, and every change reaches it through a pull request. Merging to `main` deploys to [svey.app](https://svey.app).

Setup instructions are in the [README](README.md#run-it-locally).

## The cycle

```
main ──●──────────────●──────────────●──  (each ● = one squash-merged PR, deployed)
        \            /
         feat/xyz ──●──●──   PR · CI · squash merge
```

1. **Branch off `main`.** Use a prefix that matches the change type: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `refactor/…`, `test/…`, `ci/…`. For example: `fix/tracker-center-bar`.
2. **Commit as often as you like** on the branch. Branch commits are squashed away, so they don't need to be polished.
3. **Open a pull request** early; a draft is fine. Fill in the template.
4. **Wait for the required checks.** Both must pass:
   - **CI**: lint, type-check, tests and a production build (`pnpm lint:check && pnpm check-types && pnpm test && pnpm build` reproduces it locally).
   - **Conventional PR title**: see below.
5. **Squash-merge.** The PR title becomes the single commit on `main`, and the branch is deleted automatically.
6. **The merge deploys.** `main` is built, pushed to GHCR and rolled out. Database migrations run automatically when the API starts.

`main` is protected: no direct pushes, no force-pushes, and history stays linear.

## PR titles (Conventional Commits)

Because PRs are squash-merged, the **title** is what lands on `main`. release-please reads those titles to build the changelog and decide the next version:

| Title | Changelog | Version bump |
|---|---|---|
| `feat(tracker): persist life totals across reloads` | Features | minor (1.**1**.0) |
| `fix(api): return 413 for oversized avatars` | Bug Fixes | patch (1.0.**1**) |
| `perf: …`, `refactor: …`, `revert: …` | listed | patch |
| `docs: …`, `test: …`, `build: …`, `ci: …`, `chore: …` | hidden | none on their own |
| `feat!: …` or a `BREAKING CHANGE:` footer | highlighted | major (**2**.0.0) |

Notes:
- The scope is optional. Use the area you touched: `tracker`, `decks`, `pods`, `auth`, `i18n`, `api`, `deps`, …
- Start the subject in lower case and use the imperative ("add", "fix", not "added").

## Releases

[release-please](https://github.com/googleapis/release-please) keeps a **release PR** open (`chore(main): release x.y.z`). Every merge to `main` updates it with:
- the new `CHANGELOG.md` entries
- the version bump in all three `package.json` files

Merge it whenever you want to cut a version. That tags `vX.Y.Z` and publishes the release notes on GitHub. Versions document what shipped; they don't gate deploys, since every merge already deploys.

> The release PR is opened with the workflow's built-in token, and GitHub doesn't run workflows for PRs created that way. Its required checks never report. Merge it with **"Merge without waiting for requirements"** (an admin bypass). It only touches the changelog and version numbers.

## Things to watch

- **Migrations are forward-only.** They go live with the merge that contains them. Prefer additive changes (new nullable columns, new tables) that the previous app version can live with. Never edit a migration that has shipped.
- **Rolling back** means opening a `revert:` PR. It goes through the same checks and deploys like any other change.
- **UI strings** go into both `en` and `de` locale files. A test fails otherwise.
- **No personal data or secrets** in the repo: use `.env.example` placeholders. Deploy-time values live in GitHub secrets (see the [README](README.md#deployment)).

The full coding conventions (TypeScript, Vue, API layering, i18n) are in [`.claude/CLAUDE.md`](.claude/CLAUDE.md). Those are the same rules the AI assistant works from.
