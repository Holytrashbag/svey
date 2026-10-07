# Module 3: Local setup and the first hour

**Duration:** 45 min · **Level:** Beginner · **Prerequisites:** [Module 2](02-architecture-and-decisions.md); Docker and Git installed

By the end of this module the full stack runs on your machine, you are signed in as the demo user, and you have logged a game and found its rows in the database.

## Learning objectives

After this module you can:

- Install the pinned toolchain and start the API, frontend and Postgres.
- Explain what each `.env` file configures and what happens when a value is missing.
- Use the demo seed, Drizzle Studio and the API console output.
- Diagnose the most common setup failures.

---

## Unit 1: Toolchain

| Tool | Version | Why that version |
|---|---|---|
| **Node** | **26** (from [`.nvmrc`](../../.nvmrc)) | CI (`actions/setup-node` reads `.nvmrc`) and both Dockerfiles (`node:26-alpine`) use it. Match it locally to avoid "works on my machine" |
| **pnpm** | `11.7.0`, pinned by `packageManager` in the root [`package.json`](../../package.json) | `corepack enable` installs exactly this version |
| **Docker** | any recent | Runs Postgres 17 locally ([`docker-compose.yml`](../../docker-compose.yml)) |
| **gh** | optional | PRs and issues from the terminal (Module 15) |

```sh
nvm use                    # or install Node 26 another way
corepack enable            # provides the pinned pnpm
pnpm install
```

> Always use **pnpm**, never npm or yarn. The repo has a single root `pnpm-lock.yaml`, and CI installs with `--frozen-lockfile`.

---

## Unit 2: Configure and run

```sh
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env

pnpm dev                        # DB up → migrate → seed → API on :3000, app on http://localhost:5173
```

Sign in at http://localhost:5173 with **`demo@example.com`** / **`svey-demo`**.

### What `pnpm dev` does

The root script chains the database setup in front of the apps:

```json
"dev": "pnpm db:up && pnpm db:migrate && pnpm --filter api seed && turbo run dev"
```

| Step | Command | Effect |
|---|---|---|
| 1 | `pnpm db:up` | Starts Postgres 17 in Docker on :5432 (no-op if already running). **Docker must be running**, or `pnpm dev` stops here |
| 2 | `pnpm db:migrate` | Applies any new SQL migrations; prints `skip` for applied ones |
| 3 | `pnpm --filter api seed` | Creates the demo pod (5 players, 10 decks, 14 games) the first time; afterwards it detects the demo user and does nothing |
| 4 | `turbo run dev` | Starts both apps in parallel (below) |

Each step is safe to repeat, so `pnpm dev` is the only command you need day to day. Pulling a branch with a new migration applies it on the next start. To run the apps without touching the database (e.g. against a DB you've set up differently), use `pnpm turbo run dev`.

Turbo then runs each app's `dev` script in parallel:

| App | Command | Notes |
|---|---|---|
| API | `node --env-file=.env --import tsx --watch server.ts` | No build step; restarts on file changes |
| Frontend | `vite` | HMR on :5173. The service worker is **disabled** in dev (`devOptions.enabled: false`) |

### The environment files

**`apps/api/.env`** is validated at startup by Zod in [`lib/env.ts`](../../apps/api/lib/env.ts):

```ts
const envSchema = z.object({
  DATABASE_URL:          z.string().url(),
  BETTER_AUTH_SECRET:    z.string().min(32),
  BETTER_AUTH_URL:       z.string().url(),
  FRONTEND_URL:          z.string().url(),
  DISCORD_CLIENT_ID:     z.string(),
  // … GOOGLE_*, NODE_ENV, PORT, UPLOADS_DIR, SMTP_*
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}
export const env = parsed.data
```

Two consequences:

1. A missing or malformed variable makes the API **exit immediately** with the field names. Read that message first.
2. Code never reads `process.env` directly; it imports the typed `env`. (Exceptions: `db/migrate.ts` and `drizzle.config.ts`, which run outside the app.)

The OAuth variables must *exist* but may be empty. Discord and Google login only work with real client IDs; email + password works without them.

Note the `SMTP_SECURE` parsing: env values are strings, and `z.coerce.boolean()` would turn `"false"` into `true`. The schema parses `'true'`/`'1'` explicitly. That's a good example of the care the env layer takes.

**`apps/frontend/.env`** holds `VITE_API_URL` (where the SPA sends `/api/...` requests and where Better Auth's client points) and the optional `VITE_LEGAL_*` operator details. Vite inlines `VITE_*` variables at **build time**; they are not secrets and end up in the bundle.

---

## Unit 3: Useful commands

Run from the repo root.

| Command | What it does |
|---|---|
| `pnpm lint:check && pnpm check-types && pnpm test && pnpm build` | Exactly what CI runs. Run it before pushing |
| `pnpm lint` | oxlint + ESLint with auto-fix (frontend) |
| `pnpm db:down` / `pnpm db:reset` | Stop Postgres / **wipe** the volume and restart |
| `pnpm --filter api db:studio` | Drizzle Studio: browse tables in the browser |
| `pnpm --filter api cleanup` | Run the orphan cleanup once (normally nightly) |
| `pnpm --filter api test` | API tests only |
| `pnpm --filter frontend test:watch` | Vitest in watch mode |
| `pnpm --filter frontend preview` | Serve the production build, which is where you can test the service worker |

### Things that surprise people

- **Email verification without SMTP.** With no `SMTP_*` set, [`lib/email.ts`](../../apps/api/lib/email.ts) logs the email, including the verification link, to the **API console** instead of sending it. Sign up with any address and click the logged link.
- **The seed is idempotent and refuses production.** [`jobs/seed-demo.ts`](../../apps/api/jobs/seed-demo.ts) does nothing if the demo user exists, and exits if `NODE_ENV=production`. It creates data through the real services (`createPlaygroup`, `joinPlaygroup`, `createGame`), so the data has the exact shape the app produces. It is deterministic (a seeded `mulberry32` PRNG), so screenshots are reproducible.
- **Card art needs the internet.** The first view of a commander fetches art from Scryfall and caches it under `apps/api/uploads/card-art/`. Avatars go to `apps/api/uploads/avatars/`. Both are gitignored.
- **Opening `/pods/<id>/game/tracker` directly shows a demo game.** Without a saved session in `localStorage`, the tracker seeds four fake players mid-game. Handy for UI work, confusing if you don't expect it.

---

## Unit 4: Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API exits with `Invalid environment variables: { DATABASE_URL: [...] }` | `.env` missing or incomplete | `cp apps/api/.env.example apps/api/.env` |
| `pnpm dev` fails immediately with a Docker error | Docker daemon not running | Start Docker Desktop / the daemon, rerun `pnpm dev` |
| First `pnpm dev` (or the one after `db:reset`) fails at migrate with `ECONNREFUSED` or "the database system is starting up" | `db:up` returns as soon as the container starts; a fresh Postgres volume needs a few seconds to initialise | Wait a moment and rerun `pnpm dev` |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres not running, or another Postgres owns the port | `pnpm db:up`; stop the other instance |
| `relation "playgroup" does not exist` | Migrations not applied (e.g. you started with `pnpm turbo run dev`) | `pnpm db:migrate`, or start with `pnpm dev` |
| `pnpm dev` stops at the migrate step | A migration in your branch has an SQL error; the file was rolled back | Fix the SQL and rerun (Module 7) |
| Sign-in returns 403 for a new email account | Email not verified yet (`requireEmailVerification: true`) | Click the link printed in the API console |
| Requests from the SPA fail with CORS errors | SPA on a different origin than `FRONTEND_URL` / `localhost:5173` | Use `http://localhost:5173`, or set `FRONTEND_URL` |
| `pnpm install` complains about the lockfile | Wrong pnpm version | `corepack enable`, then reinstall |
| Want a clean slate | | `pnpm db:reset && pnpm dev` (reset wipes the volume; `pnpm dev` migrates and reseeds) |

---

## Unit 5: Try it (your first hour)

1. **Explore as the demo user.** Open Home, Pods, Decks and You. Switch the language on the profile page and watch every string change.
2. **Log a game.** In the demo pod, start a game with three seats: two members and one guest. Give each a deck.
   - Reduce one player's life to 0 and watch the auto-elimination.
   - Add 21 commander damage from one opponent to another player.
   - When one player is left, the survey opens. Answer for two players, skip one.
3. **Read the recap** that opens after saving.
4. **Find the rows.** In Drizzle Studio or `psql`:

   ```sql
   select id, end_reason, duration_seconds, host_user_id from game order by started_at desc limit 1;
   select turn_order, guest_name, playgroup_member_id, death_cause, is_winner
     from game_player where game_id = '<id>' order by turn_order;
   select fun_rating, agency_rating, takeaway from survey_response where game_id = '<id>';
   ```

   Check that the guest's row has `guest_name` set and `playgroup_member_id` null, and that the skipped player has **no** `survey_response` row.
5. **Run the gates.** `pnpm lint:check && pnpm check-types && pnpm test`. Everything should be green on `main`.

---

## Summary

- Node 26 + corepack-pinned pnpm + Docker for Postgres.
- `apps/api/.env` is Zod-validated: a bad value stops the API at startup.
- Without SMTP, verification links appear in the API console.
- `pnpm dev` starts Postgres, migrates, seeds (first run only) and then both apps; every step is safe to repeat.
- The seed builds a realistic pod through the real services and is safe to rerun.

## Knowledge check

**1. You sign up with a new email locally and no email arrives. What's going on?**

- A) Sign-up is broken without OAuth keys
- B) With no SMTP configured, the verification email, including its link, is logged to the API console
- C) Emails are queued until the next deploy
- D) Local sign-ups are auto-verified

<details><summary>Answer</summary>

**B.** `sendEmail` logs instead of sending when `SMTP_HOST`, `SMTP_PORT` or `EMAIL_FROM` are unset.
</details>

**2. Where should new API code read configuration from?**

- A) `process.env.MY_VAR`
- B) The typed `env` object exported by `lib/env.ts`, after adding the variable to its Zod schema
- C) A JSON config file
- D) `import.meta.env`

<details><summary>Answer</summary>

**B.** The schema validates at startup and gives you types. Remember to document the variable in `.env.example` and, for production, `.env.prod.example`.
</details>

**3. Which single command line reproduces CI locally?**

- A) `pnpm test`
- B) `pnpm build`
- C) `pnpm lint:check && pnpm check-types && pnpm test && pnpm build`
- D) `pnpm dev`

<details><summary>Answer</summary>

**C.** These are the four steps in `.github/workflows/ci.yml`, in the same order.
</details>

**4. You run the seed twice. What happens the second time?**

- A) It duplicates all demo data
- B) It fails with a unique-constraint error
- C) It does nothing, because the demo user already exists
- D) It wipes the database first

<details><summary>Answer</summary>

**C.** The seed checks for the demo user and exits early. To start over, run `pnpm db:reset && pnpm dev`, which migrates and reseeds the empty database.
</details>

---

**Next:** [Module 4: The API request lifecycle →](04-api-request-lifecycle.md)
