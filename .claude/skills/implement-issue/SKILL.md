---
name: implement-issue
description: Implement a Holytrashbag/svey GitHub issue end to end without stopping for plan approval - fetch it, plan on a subagent, have a second cheaper subagent validate the plan, branch, write unit and end-to-end tests first, implement, and loop test → fix up to 5 rounds; green opens a PR that closes the issue, still red after 5 rounds comments progress on the issue and waits for a human. Use when asked to implement, build, fix or "do" an issue/ticket ("implement #39", "work through issue 33 autonomously"). For a plan only, use plan-ticket.
argument-hint: <issue number or URL>
---

Take an issue from ticket to an open PR. The plan is checked by a second agent rather than by the user, so the tests are the contract: write them first, never weaken them to get to green, and hand over to a human after 5 failed rounds.

Never merge: merging deploys to production. That stays the user's call (see `ship-pr`).

## 1. Fetch the issue

```bash
gh issue view <number-or-URL> --repo Holytrashbag/svey --json number,title,body,labels,comments,state
gh pr list --repo Holytrashbag/svey --state open --search "<number>"
```

Stop and ask the user if the issue is closed, if an open PR already references it, or if it has no **Definition of done** that you could turn into tests.

Choose the planning effort from the issue:

| Issue | Planner | Validator |
|---|---|---|
| **Large:** schema change, both API and frontend, auth or access checks, game-tracker/survey flow, stats, `priority: high` | `opus` | `sonnet` |
| **Small:** one layer, a handful of files, copy/UI tweak, isolated bug | `sonnet` | `haiku` |

If in doubt, treat the issue as large. The validator always runs on a cheaper model than the planner, as a different agent.

## 2. Plan (subagent)

Spawn the planner with `Agent`, `subagent_type: "Plan"`, the model from the table and `run_in_background: false`. Paste the full issue JSON into the prompt so the planner doesn't fetch it again, and tell it to:

- Read `.claude/skills/plan-ticket/SKILL.md` and `.claude/CLAUDE.md`, then follow plan-ticket sections 2–3 and its "Rules the plan must respect". It must **not** stop for approval and must **not** write files.
- Add a **Tests first** section that lists every test to write before the implementation. Give each test its file path, test name and the Definition-of-done or Scope item it proves, at two layers:
  - **Unit:** colocated `*.test.ts` next to the pure logic (`apps/frontend/src/lib/`, `apps/api/lib/`, `apps/api/services/`)
  - **End-to-end:** Playwright specs in `apps/frontend/e2e/` (see [End-to-end layer](#end-to-end-layer))
- If the change is visual (see [PR media](#pr-media-visual-changes-only)), add a **PR media** section that names the screens to capture, or the steps of the flow to record when it spans several screens.
- Resolve each Open question with the answer the issue proposes. If the issue proposes none and the answer changes behaviour, mark the question **BLOCKING**.
- Return the plan as Markdown, nothing else.

## 3. Validate the plan (different subagent, less effort)

Spawn a **new** `Plan` agent on the validator model. Do not reuse the planner agent. Give it the issue JSON and the plan, and tell it to check the plan against the code, read-only:

- Every Scope bullet and Definition-of-done item maps to a step **and** a test.
- Every file and symbol the plan names exists, at the stated paths and line numbers. New files are marked as new.
- Nothing in the plan breaks the rules in `.claude/CLAUDE.md`: access checks in services, migrations only through `add-migration`, i18n in `en` and `de`, no `any`, and the rest.
- Nothing in the plan is out of scope (compare with the issue's **Out of scope**).
- The tests would fail on today's code and pass once the plan is done. A test that passes either way proves nothing.

It must answer with `VERDICT: APPROVE` or `VERDICT: REVISE`, followed by numbered findings, each with file:line evidence.

- **APPROVE:** continue.
- **REVISE:** send the findings to the planner with `SendMessage`, which keeps its context, then validate the revised plan with a new validator. After **2** REVISE verdicts, or if the plan has a BLOCKING question, stop: show the plan and findings to the user and ask how to proceed.

Show the approved plan to the user in a short summary and keep going. Don't wait for an approval.

## 4. Branch

```bash
git status --short          # must be clean; otherwise ask the user
git fetch origin
git switch -c <type>/<issue-number>-<short-slug> origin/main
```

`<type>` is the type in the issue title (`feat`, `fix`, …). Never work on `main`.

## 5. Tests first

1. Write every test from the plan's **Tests first** section. Write no production code yet, except stubs or exported signatures the tests need in order to compile (for example a function that throws `not implemented`).
2. Run them and confirm they **fail for the reason the plan predicts**: a missing behaviour or a wrong value, not a typo or an import error.
3. Commit them on their own: `test(<scope>): cover #<n> …`, ending with the session's `Co-Authored-By` trailer.

That commit is the baseline. When you later decide whether a test was wrong, compare against it (`git diff <baseline>.. -- '*.test.ts' 'apps/frontend/e2e/**'`).

## 6. Implement → test loop (max 5 rounds)

**Round 1:** implement the plan step by step. Use the `add-migration` skill for any schema change. Then run the checks.

**Every round runs:**

```bash
pnpm --filter api test && pnpm --filter frontend test   # unit + the tests you wrote
<end-to-end command>                                    # see End-to-end layer
pnpm lint:check && pnpm check-types && pnpm build       # the rest of CI
```

A round is **green** only when everything passes. Any failure counts, lint and types included.

**If the round is red:** read the failures, then decide which side is wrong before changing anything:

- **The implementation is wrong** (the usual case): fix the code.
- **The test is wrong**: it contradicts the issue or the approved plan, or it asserts an incidental detail such as exact markup, a call order or a timestamp. Fix the test, and write one line in the round log saying why. Never delete a test, loosen an assertion or mark it `skip`/`todo` only to get to green. If the test is right and the code can't satisfy it, that goes to the human review.

Commit each round (`fix(<scope>): round N – …` is fine; it gets squashed) and keep a short round log in the conversation:

```
Round 2 — red: tracker.test.ts "poison 10 eliminates" (autoDeath ignored poison) → fixed in lib/game-tracker.ts
```

Then start the next round. Stop at the **first green round**, or after **round 5** if it's still red.

## 7a. Green → open the PR

Follow the `ship-pr` skill from step 3 onwards. The branch and commits already exist. Use these specifics:

- Title: the issue title, which is already a Conventional Commit.
- Body: `Closes #<n>` under "What & why", plus one line on how each Open question was resolved.
- "How I tested it": the tests written first, the number of rounds it took, and the commands that ran. Only list checks that actually ran.
- Visual change: capture and publish the media **before** `gh pr create` (see [PR media](#pr-media-visual-changes-only)) and add a `## Screenshots` section between "What & why" and "How I tested it".
- Watch the PR checks. Report the PR URL. Do not merge.

## 7b. Still red after round 5 → human review

1. **Reiterate:** go back over the round log and the plan. Name the failing tests, the root cause as far as you understand it, what you tried, and whether you suspect the plan, the tests or the issue itself.
2. **Push the branch** so the work can be seen (`git push -u origin HEAD`). Don't open a PR.
3. **Comment on the issue:**
   ```bash
   gh issue comment <n> --repo Holytrashbag/svey --body-file - <<'EOF'
   ## Implementation status: needs human review

   Branch: `<branch>` (<compare link>). Stopped after 5 test/fix rounds.

   **Done:** <steps from the plan that are complete>
   **Still failing:** <test names + one-line reason each>
   **Tried:** <round log, condensed>
   **Question for you:** <the decision or information that would unblock it>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   ```
4. **Wait:** tell the user the same thing in chat, with the comment link, and stop. Don't run more rounds, don't open a PR, and don't touch the tests until the human replies.

When feedback arrives (in chat, or as a new issue comment the user points you to), apply it. If it changes the plan or the tests, update those first, then resume step 6 with a fresh budget of 5 rounds.

## End-to-end layer

The repo has a **Playwright suite** in `apps/frontend/e2e/` that runs against the real stack: a `svey_e2e` database that is dropped, migrated and seeded on every run, the API on :3100 (`apps/api/.env.e2e`) and the production build served by `vite preview` on :4174. It uses Chromium at a 360px viewport with the `en-US` locale. Service workers are blocked, external requests are aborted and `/api/cards/**` is stubbed.

- **Specs:** add `apps/frontend/e2e/<flow>.spec.ts` and import `test`/`expect` from `e2e/fixtures.ts`. Each test starts signed in as the demo user (Alex), and the `pod` fixture gives it a fresh pod that Jordan has joined, so specs never depend on each other. Setup drivers (`openSetup`, `setSeatCount`, `seatMember`, `seatGuest`, `startGame`, `tile`, `dialog`, `openGameMenu`) live in `e2e/helpers/game.ts`.
- **Locators:** use role and accessible name with the English copy from `src/i18n/locales/en`, scoped to the seat, sheet (`role="dialog"`) or tile (`role="group"`) they act on. If a control has no accessible name, add an `aria-label` through `t()` (en + de) as part of the plan. Don't use test ids.
- **What to assert:** the rendered UI, the request bodies the app sends (`page.waitForRequest`) and the saved state read back through the API (`page.request`, which shares the signed-in cookies).
- **Command:** `pnpm db:up && pnpm test:e2e` from the repo root. This is the `<end-to-end command>` in step 6. It needs Docker and free ports 3100 and 4174. If they're unavailable, say so in the PR and list the e2e suite as not run.
- **Below the browser:** API route tests in `apps/api/test/routes/<domain>.test.ts` (`build(t)` + `app.inject()`, no database) still cover validation, `requireAuth`, the error envelope and status codes. Vitest flow tests that mount a view with a real Pinia and router, mocking only `src/lib/api.ts`, remain the fast way to cover edge cases the browser suite doesn't need to repeat. Both run in `pnpm test`, which must stay database-free.

If a Definition-of-done item can only be proven in a real browser or against a real database, say so in the plan and in the PR's "How I tested it", and list it as a manual check. Don't pretend a test covers it.

## PR media (visual changes only)

Attach screenshots when the diff changes what a user sees: `.vue` templates or classes, `src/style.css`, or visible copy. Skip it for API-only, pure-logic, test and tooling changes. When the change spans several screens (a flow, a sheet that opens, a step-by-step state change), add a short GIF of the flow next to the screenshots.

**What GitHub can show.** A PR body can't upload files from the CLI. Real video players (`.mp4`/`.mov`) only appear for files dragged into the web editor; `<video>` tags are stripped and a link to a raw `.mp4` stays a plain link. Images and **animated GIFs** referenced by URL render inline. So: PNG screenshots plus an optional GIF, hosted on the orphan `pr-media` branch of this public repo. It's never merged and pushing it triggers no workflow.

**1. Capture** with a throwaway spec, run after the first green round. It reuses the e2e stack and fixtures, so every screen shows seeded demo data. Never capture from the dev database or production.

```ts
// apps/frontend/e2e/_pr-media.spec.ts — never commit this file
import { test } from './fixtures'
import { openSetup, startGame /* … */ } from './helpers/game'

const out = process.env.PR_MEDIA_DIR ?? 'test-results/pr-media'
test.use({
  deviceScaleFactor: 2,                                       // crisp PNGs
  video: { mode: 'on', size: { width: 360, height: 800 } },   // multi-screen only
  launchOptions: { slowMo: 300 },                             // a GIF a human can follow
})

test('pr media', async ({ page, pod }) => {
  await openSetup(page, pod.id)
  // … drive to each state from the plan's PR media section, waiting for it
  // to be visible so a sheet isn't caught mid-transition …
  await page.screenshot({ path: `${out}/01-setup.png`, animations: 'disabled' })
})
```

```bash
pnpm db:up
PR_MEDIA_DIR=<scratchpad>/pr-media pnpm --filter frontend exec playwright test _pr-media
rm apps/frontend/e2e/_pr-media.spec.ts
```

Number the files in flow order (`01-…`, `02-…`). Use the English locale; add a German shot (a second test inside `test.describe` with `test.use({ locale: 'de-DE' })`; the app falls back to the browser language) when the change adds copy that might wrap or overflow at 360px.

**2. GIF (multi-screen only).** Playwright writes `video.webm` under `apps/frontend/test-results/<test-dir>/`. Its bundled ffmpeg can't write GIFs, so convert with a system `ffmpeg`:

```bash
ffmpeg -y -i <video.webm> -vf "hqdn3d,mpdecimate,fps=10,scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 <scratchpad>/pr-media/flow.gif
```

The recording is noisy VP8, so a plain palette conversion changes every pixel of every frame: an 11 s flow came out at 6.8 MB. Denoising (`hqdn3d`), dropping duplicate frames (`mpdecimate`) and a 64-colour palette without dithering brought the same clip to 2.9 MB, still readable. Keep it under 5 MB: trim with `-ss`/`-t`, or go down to `scale=240`. If `ffmpeg` isn't installed, skip the GIF, rely on the numbered screenshots and say so in the PR. Don't install packages without asking.

**3. Publish** to `pr-media` under `issue-<n>/` through a separate worktree, so the feature branch stays untouched:

```bash
MEDIA=<scratchpad>/pr-media-worktree
if git ls-remote --exit-code --heads origin pr-media >/dev/null; then
  git fetch origin pr-media && git worktree add -B pr-media "$MEDIA" origin/pr-media
else
  git worktree add --orphan -b pr-media "$MEDIA"   # first use only
fi
mkdir -p "$MEDIA/issue-<n>" && cp <scratchpad>/pr-media/* "$MEDIA/issue-<n>/"
git -C "$MEDIA" add "issue-<n>" && git -C "$MEDIA" commit -m "chore: pr media for #<n>" -m "<Co-Authored-By trailer>"
git -C "$MEDIA" push origin pr-media
SHA=$(git -C "$MEDIA" rev-parse HEAD)
git worktree remove "$MEDIA"
```

Link files by commit SHA, not branch, so a re-push never shows stale images: `https://raw.githubusercontent.com/Holytrashbag/svey/$SHA/issue-<n>/<file>`. Never rewrite or delete existing files on `pr-media`: older PRs link to them.

**4. Embed** in the PR body. Screenshots go side by side at phone width, the GIF below:

```html
## Screenshots

<table><tr>
<td><img src="https://raw.githubusercontent.com/Holytrashbag/svey/<SHA>/issue-<n>/01-setup.png" width="240" alt="Setup with six seats"></td>
<td><img src="https://raw.githubusercontent.com/Holytrashbag/svey/<SHA>/issue-<n>/02-sheet.png" width="240" alt="Commander damage sheet open"></td>
</tr></table>

<img src="https://raw.githubusercontent.com/Holytrashbag/svey/<SHA>/issue-<n>/flow.gif" width="240" alt="Opening the sheet and dealing damage">
```

If the capture fails, open the PR anyway and list the screenshots as missing under "How I tested it". Media never blocks a green PR.

## Guardrails

- Never merge, never push to `main`, never touch the release-please PR.
- Commenting on the issue, pushing the feature branch and pushing media to `pr-media` are part of this skill. Anything else outward-facing (closing or relabelling issues, opening other PRs) needs the user's OK.
- All the rules from `.claude/CLAUDE.md` apply to both the tests and the code.
