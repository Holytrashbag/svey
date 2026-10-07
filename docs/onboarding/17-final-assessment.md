# Module 17: Final assessment

**Duration:** 90 min · **Level:** All · **Prerequisites:** Modules 1–16

This assessment checks that you can apply what you learned, not just recall it. It has two parts:

- **Part A:** 30 scenario questions across the whole path. Answer all of them before opening the answer key. Aim for **24 or more (80%)**; for each miss, re-read the module named in the key.
- **Part B:** five hands-on labs on your local setup. Each has acceptance criteria. Review the results with your mentor.

---

## Part A: Questions

**1.** A player's card says "you lose the game". How does the tracker record it?

- A) Automatically, via `autoDeath`
- B) Through the manual-elimination sheet, saved as `death_cause = 'special'`
- C) As a concession
- D) It can't be recorded

**2.** Which pairing of names is correct?

- A) UI "Pod" · DB table `pod` · API `/api/pods`
- B) UI "Pod" · DB table `playgroup` · API `/api/playgroups` · SPA route `/pods`
- C) UI "Playgroup" · DB `playgroup` · API `/api/pods`
- D) UI "Group" · DB `group` · API `/api/groups`

**3.** Which statement about production is **false**?

- A) Caddy serves the SPA and proxies `/api/*` and `/uploads/*` to the API
- B) The API container's port 3000 is reachable from the internet
- C) Postgres publishes no host port
- D) The SPA and API share one origin

**4.** The API refuses to start locally and prints `Invalid environment variables: { BETTER_AUTH_SECRET: [...] }`. The most likely cause?

- A) Postgres is down
- B) The secret is missing or shorter than 32 characters
- C) OAuth keys are empty
- D) Port 3000 is taken

**5.** A client posts `{ "podId": "abc" }` to `POST /api/games`. What happens?

- A) The service throws `Errors.badRequest`
- B) Zod validation rejects it before the handler runs; the client gets 400 with code `BAD_REQUEST`
- C) 500
- D) The game is saved with defaults

**6.** Which endpoint has no `requireAuth`, by design?

- A) `GET /api/decks`
- B) `GET /api/cards/art`
- C) `GET /api/notifications`
- D) `POST /api/games`

**7.** A pending member calls `DELETE /api/playgroups/:id/members/:memberId` on **their own** pending row. Result?

- A) 403, since only admins can remove members
- B) 204: removing yourself (leaving, or declining an invite) is allowed
- C) 404
- D) 409

**8.** You need to send a notification when a game is saved. Where and how?

- A) In the route handler, before calling the service
- B) Inside the `createGame` transaction, so it rolls back with the game
- C) In the service, after the transaction succeeds, wrapped in `try/catch` so a notification failure never fails the save
- D) From the frontend after the 201

**9.** After the pod owner deletes their account, what is in `playgroup.created_by`?

- A) `NULL`
- B) The id of the next admin
- C) The sentinel user id `00000000-0000-0000-0000-000000000000`
- D) The row is deleted with the pod

**10.** Why does `cleanupOrphanedData` delete a pod's games before the pod itself?

- A) Performance
- B) `game.playgroup_id` has no `ON DELETE CASCADE`, so deleting the pod first would fail
- C) To send notifications in order
- D) Games are on a different database

**11.** A new migration fails on a production container start. What's the state?

- A) The migration is half-applied, and the API runs with a broken schema
- B) That file's transaction rolls back, `migrate.js` exits non-zero, `set -e` stops the entrypoint, so the API doesn't start (and keeps restarting) until a fixed migration is deployed
- C) The API starts and logs a warning
- D) Docker reverts to the previous image automatically

**12.** The highest migration is `008_notification_params.sql`. You add a column. Which filename?

- A) `9_add_column.sql`
- B) `009_add_column.sql`
- C) `008_notification_params_v2.sql`
- D) Edit `008_notification_params.sql`

**13.** Where are OAuth access tokens encrypted?

- A) In the browser before sign-in
- B) In Better Auth `databaseHooks.account.create/update.before`, via `encryptToken` (AES-256-GCM)
- C) By Postgres with `pgcrypto`
- D) They aren't stored

**14.** A user deletes their account. Which is **deleted** rather than anonymised or reassigned?

- A) Games they hosted
- B) Their seats in past games
- C) Their own survey responses
- D) Decks used in games

**15.** When must `CURRENT_TERMS_VERSION` change?

- A) On every release
- B) Whenever the legal texts (terms/privacy) change
- C) When a migration touches `"user"`
- D) Never

**16.** A deck has `bracket_override = 3`. A re-sync sets `bracket_estimated` from 2 to 4. What bracket does the app show?

- A) 4
- B) 3
- C) 2
- D) The average, 3.5

**17.** You add commander art to a new screen. Which is correct?

- A) `<img src="https://cards.scryfall.io/...">`
- B) `<img :src="apiUrl('/cards/art?name=…&version=art_crop')">` plus an illustrator credit via the card store
- C) Download images into `public/`
- D) `api.get('/cards/art')` and convert to base64

**18.** Pod standings: Ana 2 wins / 2 games, Ben 5 / 6, Cleo 0 games, Dev 0 / 3. Order?

- A) Ben, Ana, Dev, Cleo
- B) Ana, Ben, Dev, Cleo
- C) Ana, Ben, Cleo, Dev
- D) Ben, Ana, Cleo, Dev

**19.** As the code stands today, a retired game affects…

- A) Nothing
- B) Pod standings only
- C) Profile and deck stats (it counts there), but not pod standings
- D) Pod standings and profile stats equally

**20.** You add `GET /api/seasons`. Where does the frontend type for its response go?

- A) Inline in the store
- B) In `apps/frontend/src/types/api.ts`, mirroring the service's exported type
- C) A shared package
- D) Inferred from the API at runtime

**21.** Navigating to `/impressum`, does the router guard call `authClient.getSession()`?

- A) Yes, always
- B) No: the route has neither `requiresAuth` nor `guestOnly`, so the guard returns immediately
- C) Only when signed in
- D) Only in production

**22.** In the tracker a player concedes. What reaches the database?

- A) `death_cause = 'concede'` plus the chosen reasons
- B) `death_cause = 'conceded'`; the concede reasons aren't sent
- C) `death_cause = 'special'`
- D) Nothing until the game ends

**23.** Someone reloads the tracker page mid-game. What happens?

- A) Everything resumes exactly
- B) The seats are kept (session in `localStorage`), but life, poison, commander damage and the clock restart
- C) The game is cancelled
- D) The game is saved as retired

**24.** A teammate closes the survey with the × after a 90-minute game. Result?

- A) The game is saved without survey answers
- B) Nothing is saved; both `localStorage` keys are cleared
- C) The survey reopens on next launch
- D) The game is saved as retired

**25.** You add a German string. Which is correct?

- A) "Sie haben noch keine Spielgruppen."
- B) "Du hast noch keine Playgroups."
- C) Only add it to `de`; `en` is optional
- D) Hard-code it in the template

**26.** Which of these does CI **not** run?

- A) oxlint and ESLint
- B) `vue-tsc --build`
- C) Integration tests against a real Postgres
- D) `vite build`

**27.** Which PR title fits a change that shows average fun rating on the deck page?

- A) `Feat: Show fun rating`
- B) `feat(decks): show average fun rating`
- C) `decks: show average fun rating`
- D) `feat(decks): Showed average fun rating`

**28.** Where does the production host get `docker-compose.prod.yml` from?

- A) A `git pull` on the host
- B) The deploy job copies it (with the Caddyfile and `scripts/`) via SCP on every deploy
- C) It's baked into the API image
- D) It's created by cloud-init

**29.** Why does the backup script write to `*.tmp` and then `mv`?

- A) To compress better
- B) So a failed or interrupted dump never leaves a truncated file that would be pruned, mirrored or restored as if valid
- C) `age` requires it
- D) To bypass retention

**30.** You want to rename the `deck.name` column. What's the right plan?

- A) One migration with `RENAME COLUMN`, plus the code change, in one PR
- B) Add the new column (backfilled) and switch the code in one PR; drop the old column in a later PR
- C) Edit `001_initial_schema.sql`
- D) `db:push`

---

## Part B: Labs

### Lab 1: Trace a game through the stack (30 min)

1. Locally, start a 4-seat game in the demo pod with three members and one guest.
2. Eliminate one player by commander damage, one by poison, and let one concede.
3. Answer the survey for two players; skip the others.
4. Capture the `POST /api/games` request body from DevTools.

**Acceptance criteria:** a short note (in your onboarding issue) that shows:

- the request body, with each tracker cause mapped to its API cause;
- the `game`, `game_player` and `survey_response` rows created (SQL output);
- where `died_at` came from (`started_at + deathAt`), and why two seats have no survey row.

### Lab 2: Test a pure rule (20 min)

Add tests, without changing production code, for behaviour that isn't covered yet:

- **API**, in [`apps/api/lib/pod-stats.test.ts`](../../apps/api/lib/pod-stats.test.ts): a member whose only games are draws has `gamesPlayed > 0`, `wins = 0`, a win rate of `0` (not `null`) and a threat of `0`.
- **Frontend**, in a new `apps/frontend/src/lib/mtg.test.ts`: `colorStripBg` from [`lib/mtg.ts`](../../apps/frontend/src/lib/mtg.ts) returns the neutral fill for an empty identity, the plain mana hex for one color, a `90deg` gradient with hard stops at 0 / 50 / 100 % for two colors, and `180deg` when `direction` is `'vertical'`.

**Acceptance criteria:** `pnpm test` is green; each test name states the rule it pins; the new file follows the colocation convention.

### Lab 3: Draft a migration (30 min, throwaway branch)

Following the [`add-migration`](../../.claude/skills/add-migration/SKILL.md) skill, add a nullable `game.table_notes TEXT` column:

1. Baseline with `db:generate`, edit `schema.ts`, generate the diff.
2. Save it as the next numbered file in house style, with a top comment.
3. `pnpm db:reset && pnpm db:migrate && pnpm --filter api seed`.

**Acceptance criteria:** `db:migrate` prints `apply 009_…`; `schema.ts` and the SQL agree. Then write down which other files would need changing to ship it for real (hint: Zod schema, service, `types/api.ts`, recap UI, both locales, and `account.service.ts`, because free-text notes can contain personal data). **Don't open a PR**; delete the branch afterwards.

### Lab 4: Break and fix i18n (15 min)

1. Add a key `home.greeting` = `"Welcome back, {name}!"` to `en/home.json` only. Run `pnpm --filter frontend test` and read the failure.
2. Add the German entry **without** `{name}`. Read the new failure.
3. Fix it properly (informal "du"), and use the key in a component via `t('home.greeting', { name })`.

**Acceptance criteria:** you can explain each of the two failures and which assertion in `messages.test.ts` caught it. Revert afterwards.

### Lab 5: Ship a real PR (45 min)

Improve these onboarding pages: fix something that was unclear, outdated or wrong for you. Follow the [`ship-pr`](../../.claude/skills/ship-pr/SKILL.md) flow:

- branch `docs/onboarding-<topic>` from `origin/main`;
- run the full CI line locally;
- open the PR with a Conventional title such as `docs(onboarding): clarify placement ranking`, and fill in the template.

**Acceptance criteria:** both required checks are green; your mentor reviews and merges it. (Merging deploys, which for docs is harmless, and that's the point: you'll have walked the whole pipeline once.)

### Optional Lab 6: Restore drill (with the key holder)

Run the quarterly restore drill from [`docs/ops/backup-restore.md`](../ops/backup-restore.md) against a throwaway container, then record the date and result in the runbook's drill table via a `docs:` PR.

---

## Answer key

<details><summary>Open only after answering all 30 questions</summary>

| # | Answer | Why | Review |
|---|---|---|---|
| 1 | B | Only life, poison and single-commander damage are automatic; card effects use manual elimination (`manual` → `special`) | M1, M12 |
| 2 | B | "Pod" in UI and SPA routes, `playgroup` in DB and API | M1 |
| 3 | B | `api` only `expose`s 3000 to the Compose network; only Caddy publishes 80/443 | M2, M16 |
| 4 | B | `lib/env.ts` requires `BETTER_AUTH_SECRET` with `min(32)` | M3 |
| 5 | B | The route's Zod schema rejects it (`uuid()`, missing fields); framework 4xx passes through as `BAD_REQUEST` | M4 |
| 6 | B | Card art and meta are public on purpose and can't proxy arbitrary URLs | M4, M9 |
| 7 | B | `removeMember` allows `isSelf`, and its caller lookup doesn't require an active membership | M5 |
| 8 | C | Best-effort side effects go after the main write, in `try/catch` | M5 |
| 9 | C | `deleteAccountData` reassigns `created_by` to `DELETED_USER_ID` | M6, M8 |
| 10 | B | No cascade on `game.playgroup_id` | M6 |
| 11 | B | One transaction per file, the runner exits 1, the entrypoint has `set -e` | M7, M16 |
| 12 | B | Three-digit prefixes sort correctly; never edit shipped files | M7 |
| 13 | B | `databaseHooks` + `lib/token-crypto.ts` | M8 |
| 14 | C | Survey responses are personal authored content; seats are anonymised; hosted games and used decks are reassigned | M8 |
| 15 | B | It records which legal text version a user accepted | M8 |
| 16 | B | `bracket = override ?? estimated` | M9 |
| 17 | B | Proxy via `apiUrl`, and credit the illustrator | M9 |
| 18 | B | Win rate desc: Ana 100%, Ben 83%, Dev 0%, then Cleo (`null`) last | M10 |
| 19 | C | `stats.service.ts` filters only on `status = 'completed'`; pod standings use `isFinishedGame` | M10 |
| 20 | B | `types/api.ts` is the hand-maintained contract | M11 |
| 21 | B | The guard returns early for routes without auth meta | M11 |
| 22 | B | `concede` → `conceded`; concede reasons are UI only | M12 |
| 23 | B | Tracker state is in memory; the session survives a reload | M12 |
| 24 | B | `onAbandon` clears both keys without posting | M12 |
| 25 | B | Informal "du"; "Playgroup" stays untranslated; both locales required | M13 |
| 26 | C | No database in tests (known gap) | M14 |
| 27 | B | Conventional type and scope, lower-case imperative subject | M15 |
| 28 | B | `appleboy/scp-action` copies `docker-compose.prod.yml,Caddyfile,scripts` | M16 |
| 29 | B | Atomic rename; the same idea as the card-art cache writes | M16, M9 |
| 30 | B | Expand/contract across two PRs | M7 |

</details>

---

## After the assessment

With your mentor:

- [ ] Review missed questions and the modules behind them.
- [ ] Review Labs 1–4 notes; merge Lab 5.
- [ ] Pick a first real issue, ideally labelled `good first issue`, or one of the known gaps from [Module 2](02-architecture-and-decisions.md#unit-6-known-gaps) and [Module 10](10-stats-and-aggregations.md#unit-5-sharp-edges). Plan it with the `plan-ticket` skill before coding.

Welcome to the team. 🎉

← [Back to the learning path](README.md)
