# Module 15: Workflow, PRs and releases

**Duration:** 35 min · **Level:** Beginner · **Prerequisites:** Git and GitHub basics

In Svey, **merging is deploying**. The workflow exists so that every merge is small, green and described in a way that turns into a changelog. This module covers the cycle from issue to release, and the automation around it.

## Learning objectives

After this module you can:

- Run the GitHub-flow cycle: branch, commit, PR, checks, squash merge.
- Write a PR title that passes the check and produces the right changelog entry and version bump.
- Explain what release-please and Dependabot do, and why the release PR is merged differently.
- File an issue with the house title, labels and body structure.
- Use the project's Claude Code skills and know when to update them.

---

## Unit 1: GitHub flow

```
main ──●──────────────●──────────────●──  (each ● = one squash-merged PR, deployed)
        \            /
         feat/xyz ──●──●──   PR · CI · squash merge
```

1. **Branch from `origin/main`** with a type prefix: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `refactor/…`, `test/…`, `ci/…` (e.g. `fix/39-pod-win-rate`).
2. **Commit freely.** Branch commits are squashed away; they don't need polish.
3. **Open a PR early** (draft is fine) and fill in [the template](../../.github/pull_request_template.md): *What & why*, *How I tested it* (phone width, EN + DE), and the checklist.
4. **Two required checks:** **CI** (lint · types · tests · build) and **Conventional PR title**.
5. **Squash-merge.** The PR title becomes the one commit on `main`; the branch is deleted.
6. **The merge deploys** to [svey.app](https://svey.app), migrations included.

`main` is protected: no direct pushes, no force-pushes, linear history.

**Rolling back** = open a `revert:` PR. It goes through the same checks and deploys like anything else. Database changes can't be reverted this way, which is why migrations must be backward compatible (Module 7).

---

## Unit 2: PR titles are the changelog

Because of squash merges, the **title** is what lands on `main`, and [release-please](https://github.com/googleapis/release-please) reads those titles.

Format: `type(scope): subject`. The subject starts lower-case and uses the imperative.

| Title | Changelog section | Version bump |
|---|---|---|
| `feat(tracker): persist life totals across reloads` | Features | minor (1.**1**.0) |
| `fix(api): return 413 for oversized avatars` | Bug Fixes | patch (1.0.**1**) |
| `perf: …`, `refactor: …`, `revert: …` | listed | patch |
| `docs: …`, `test: …`, `build: …`, `ci: …`, `chore: …` | hidden | none on their own |
| `feat!: …` or a `BREAKING CHANGE:` footer | highlighted | major (**2**.0.0) |

Scopes in use: `tracker`, `games`, `game-setup`, `pods`, `decks`, `home`, `stats`, `auth`, `i18n`, `api`, `deps`, `claude`, …

The check is [`pr-title.yml`](../../.github/workflows/pr-title.yml) (`amannn/action-semantic-pull-request`) with:

```yaml
subjectPattern: ^(?:(?![A-Z])|Bump ).+$
```

i.e. the subject must not start with a capital letter, except Dependabot's `Bump …`, which can't be configured otherwise.

---

## Unit 3: Releases

release-please ([workflow](../../.github/workflows/release-please.yml), [config](../../release-please-config.json), [manifest](../../.release-please-manifest.json)) keeps **one** release PR open, titled `chore(main): release x.y.z`. After every merge it rewrites that PR with:

- new `CHANGELOG.md` entries built from the squash-commit titles;
- the version bump in **all three** `package.json` files (root, `apps/api`, `apps/frontend`).

Merging it tags `vX.Y.Z` and publishes the GitHub release. **Versions document what shipped; they don't gate deploys**, since every merge already deployed.

> **The one exception to "never bypass checks".** The release PR is opened with the workflow's built-in token, and GitHub doesn't run workflows for PRs created that way, so its required checks never report. It is the **only** PR merged with the admin bypass ("Merge without waiting for requirements"). It only touches the changelog and version numbers. Merge it only when a release is wanted; see the [`release`](../../.claude/skills/release/SKILL.md) skill.

---

## Unit 4: Dependabot

[`.github/dependabot.yml`](../../.github/dependabot.yml) opens grouped, weekly (Monday) PRs:

| Ecosystem | Title prefix | Notes |
|---|---|---|
| npm runtime deps | `fix(deps): …` | They ship, so they trigger a patch release |
| npm dev deps | `chore(deps-dev): …` | No release on their own |
| GitHub Actions | `ci(deps): …` | |

- **7-day cooldown:** brand-new releases are skipped for a week as a supply-chain safety margin.
- **Minor and patch updates are grouped** into one PR; majors get their own PR to review.
- **Only the root directory is listed**, because the single root lockfile covers `apps/*`. Listing the apps separately would produce PRs that bump `package.json` without the lockfile.
- **`@types/node` majors are ignored**: they must move together with the Node version in `.nvmrc` and the Dockerfiles.

Dependabot PRs go through the same CI. Review the changelog of anything that touches auth, the database driver, or the build.

---

## Unit 5: Issues

Issues follow the conventions in the [`create-github-issue`](../../.claude/skills/create-github-issue/SKILL.md) skill.

**Title:** a Conventional Commit, the same one the PR will use later (`fix(tracker): show the game timer only once`).

**Labels:** exactly one of each:

| Kind | Labels |
|---|---|
| Type | `bug`, `enhancement`, `documentation` |
| Area | `area: tracker`, `area: games`, `area: stats`, `area: docs`, … |
| Priority | `priority: high`, `priority: medium`, `priority: low` |
| Extra | `accessibility`, `good first issue`, `help wanted`, `question` |

**Body sections:** Problem · Scope · Out of scope · Open question · Definition of done · Pointers (files and lines to start from).

---

## Unit 6: Working with Claude Code

Svey is developed with Claude Code as a pair programmer. The conventions it follows are the same ones you do:

| File | Purpose |
|---|---|
| [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) | The full coding conventions. Read it once end to end |
| [`AGENTS.md`](../../AGENTS.md) | Turborepo's managed guidance for AI agents |
| [`.claude/skills/`](../../.claude/skills/) | Playbooks, usable by you and the assistant |

| Skill | Use it when |
|---|---|
| `plan-ticket` | Planning an issue: fetch it, read the code, propose a plan, wait for approval |
| `implement-issue` | Implementing an issue autonomously: plan + validation, tests first, up to 5 test/fix rounds, then a PR (or a progress comment for a human) |
| `create-github-issue` | Filing, labelling or closing issues |
| `add-migration` | Any schema change (Module 7) |
| `ship-pr` | Branch → local CI → push → `gh pr create`. Never merges |
| `release` | Reviewing or merging the release-please PR |

**Rule:** when a workflow or convention changes, update the matching skill (and `CLAUDE.md`, `CONTRIBUTING.md`, and these onboarding pages) **in the same PR**.

Personal Claude settings go in `.claude/settings.local.json`, which is gitignored.

---

## Unit 7: Things never to commit

- `.env`, `.env.prod`, `.backup.env` and any key material (`*.key`, `*.pem`). Use `.env.example` placeholders.
- Personal data, including the operator's address: it's injected at build time.
- Anything under `docs/private/` (e.g. the GDPR Art. 30 record), which is gitignored for that reason.

The repository is **public**.

---

## Summary

- Branch with a type prefix → PR with template → CI + title check → squash merge → automatic deploy.
- The PR title is a Conventional Commit; it decides the changelog section and version bump.
- release-please maintains the release PR, which is the only PR merged with the admin bypass.
- Dependabot: weekly, grouped, 7-day cooldown, Conventional prefixes.
- Update skills and docs in the same PR as the convention they describe.

## Knowledge check

**1. Which PR title passes the check and produces a patch release?**

- A) `Fix tracker timer`
- B) `fix(tracker): Show the timer once`
- C) `fix(tracker): show the timer once`
- D) `bugfix(tracker): show the timer once`

<details><summary>Answer</summary>

**C.** (A) has no type, (B) starts the subject with a capital, (D) uses an unknown type.
</details>

**2. You merge `docs: explain the stats rules`. What happens?**

- A) A new version is tagged
- B) It deploys to production; the release PR doesn't list it (docs are hidden) and it bumps no version on its own
- C) Nothing; docs PRs don't deploy
- D) The release PR closes

<details><summary>Answer</summary>

**B.** Every merge to `main` deploys. `docs` is a hidden changelog section with no bump.
</details>

**3. Why is the release PR merged with an admin bypass?**

- A) It's urgent
- B) It's opened with the workflow's `GITHUB_TOKEN`, so GitHub doesn't run its required checks; they would never report
- C) Its CI always fails
- D) Admins must approve all releases

<details><summary>Answer</summary>

**B.**
</details>

**4. A runtime dependency had a release yesterday. When will Dependabot propose it?**

- A) Today
- B) After the 7-day cooldown, in a Monday run
- C) Never; runtime deps are pinned
- D) Only when you ask

<details><summary>Answer</summary>

**B.**
</details>

**5. You change the PR checklist convention. What else belongs in the same PR?**

- A) Nothing
- B) Updates to the affected skill(s), `CONTRIBUTING.md`/`CLAUDE.md` and these onboarding pages where they describe it
- C) A release
- D) A new issue

<details><summary>Answer</summary>

**B.**
</details>

---

**Next:** [Module 16: DevOps and production →](16-devops-and-production.md)
