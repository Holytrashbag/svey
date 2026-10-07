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

## End-to-end tests

The Playwright suite in [`apps/frontend/e2e/`](apps/frontend/e2e) drives the real app the way a player uses it: the built SPA, the API and Postgres, in Chromium at a 360px-wide phone viewport.

```sh
pnpm db:up && pnpm test:e2e
```

That's all a fresh checkout needs (plus Docker). Each run:

1. drops, recreates, migrates and seeds a separate **`svey_e2e`** database on the docker-compose Postgres. Your dev database (`svey`) is never touched, and the reset refuses any database name that doesn't end in `_e2e`;
2. starts the API on **:3100** ([`apps/api/.env.e2e`](apps/api/.env.e2e)) and serves a production build with `vite preview` on **:4174** ([`apps/frontend/.env.e2e`](apps/frontend/.env.e2e)). Both ports must be free;
3. runs the specs. Each spec creates its own pod through the API, so specs don't depend on each other.

Both `.env.e2e` files are committed on purpose: like `apps/api/.env.test`, they hold dummy values only.

Useful variations (from `apps/frontend`):
- `pnpm test:e2e --ui` or `pnpm test:e2e --headed` to watch the browser.
- `pnpm exec playwright show-report` to open the HTML report after a failure (traces and screenshots included).
- On Linux/WSL, if Chromium is missing system libraries: `pnpm exec playwright install --with-deps chromium` (needs sudo).

Writing specs:
- Import `test`/`expect` from [`e2e/fixtures.ts`](apps/frontend/e2e/fixtures.ts). Every test starts signed in as the demo user (Alex) and can ask for a fresh `pod` that Jordan has joined. Drivers for game setup live in `e2e/helpers/game.ts`.
- Locate by role and accessible name using the English copy from `src/i18n/locales/en`. If a control has no accessible name, give it an `aria-label` through `t()` rather than adding a test id.
- The suite never leaves localhost: external requests are aborted and the card-art endpoints (`/api/cards/**`) are stubbed.

In CI, the **End-to-end (Playwright)** job runs on pull requests with a Postgres service container and uploads the `playwright-report` artifact when it fails. It isn't a required check yet.

## Things to watch

- **Migrations are forward-only.** They go live with the merge that contains them. Prefer additive changes (new nullable columns, new tables) that the previous app version can live with. Never edit a migration that has shipped.
- **Rolling back** means opening a `revert:` PR. It goes through the same checks and deploys like any other change.
- **UI strings** go into both `en` and `de` locale files. A test fails otherwise.
- **No personal data or secrets** in the repo: use `.env.example` placeholders. Deploy-time values live in GitHub secrets (see the [README](README.md#deployment)).

The full coding conventions (TypeScript, Vue, API layering, i18n) are in [`.claude/CLAUDE.md`](.claude/CLAUDE.md). Those are the same rules the AI assistant works from.
