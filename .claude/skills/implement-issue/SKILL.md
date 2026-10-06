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
  - **End-to-end:** the deepest layer the repo supports (see [End-to-end layer](#end-to-end-layer))
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

That commit is the baseline. When you later decide whether a test was wrong, compare against it (`git diff <baseline>.. -- '*.test.ts'`).

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

Use the first one of these that exists:

1. **Browser suite:** if `apps/frontend/e2e/` and a `test:e2e` script exist (for example Playwright), add specs there and run `pnpm --filter frontend test:e2e`. The Vitest config already excludes `e2e/**`.
2. **Otherwise**, the repo has no browser suite and no test database, so end-to-end means the full path inside each app:
   - **API:** route tests in `apps/api/test/routes/<domain>.test.ts`. They build the whole app with `build(t)` from `test/helper.ts` and call `app.inject()`, so they cover the plugins, Zod validation, `requireAuth`, the error envelope `{ error: { code, message } }` and the status codes. They need no database, so cover the paths that don't reach it (validation, 401/404, the error shape) and leave the service logic to unit tests with the DB calls factored out.
   - **Frontend:** flow tests in Vitest that mount the real view with `@vue/test-utils`, a real Pinia and the router, mocking only `src/lib/api.ts`. Drive the flow from the Definition of done (click, type, assert the rendered `t()` output and the API calls made).

   They run as part of `pnpm --filter api test` and `pnpm --filter frontend test`, so `<end-to-end command>` is already covered in step 6.

If a Definition-of-done item can only be proven in a real browser or against a real database, say so in the plan and in the PR's "How I tested it", and list it as a manual check. Don't pretend a test covers it.

## Guardrails

- Never merge, never push to `main`, never touch the release-please PR.
- Commenting on the issue and pushing the feature branch are part of this skill. Anything else outward-facing (closing or relabelling issues, opening other PRs) needs the user's OK.
- All the rules from `.claude/CLAUDE.md` apply to both the tests and the code.
