# Module 14: Testing and code quality

**Duration:** 40 min · **Level:** Intermediate · **Prerequisites:** [Modules 4](04-api-request-lifecycle.md), [10](10-stats-and-aggregations.md), [11](11-frontend-architecture.md)

Four gates protect `main`: lint, types, tests and a production build. This module explains each gate, how the two test runners work, and what's worth testing in this codebase.

## Learning objectives

After this module you can:

- Run and interpret all four CI gates locally.
- Write an API unit test with `node:test` and an app-level test with `app.inject`.
- Write a Vitest unit test and a component test with a mocked API, router and i18n.
- Decide what deserves a test and how to make logic testable without a database.
- Explain the TypeScript strictness settings that shape the code.

---

## Unit 1: The four gates

CI ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs on every PR and push to `main`, and the deploy workflow reuses it as its first job:

```sh
pnpm install --frozen-lockfile
pnpm lint:check      # oxlint + ESLint (frontend)
pnpm check-types     # tsc --noEmit (API) · vue-tsc --build (frontend)
pnpm test            # node:test (API) · Vitest (frontend)
pnpm build           # tsc → dist (API) · vue-tsc + vite build (frontend)
```

Run the same line before every push. Turbo runs each script in every workspace that defines it, so `lint:check` currently covers only the frontend (the API has no lint script; its gate is `tsc`).

---

## Unit 2: TypeScript strictness

| Setting | Where | What it means for you |
|---|---|---|
| `strict: true` | both | No implicit `any`, strict null checks |
| No `any` | convention | Use `unknown` and narrow, or define a type |
| `noUncheckedIndexedAccess` | frontend | `arr[i]` and `record[key]` are `T \| undefined`; guard them. `!` only when provably present |
| `erasableSyntaxOnly` | API | No `enum`, `namespace`, parameter properties: Node's type stripping can't run them. Use `const` objects + union types |
| `verbatimModuleSyntax` | API | Type-only imports must say `import type` |
| `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` | API | Import with `.ts`; the build rewrites to `.js` |

The enum pattern from `CLAUDE.md`, which you'll use instead of `enum`:

```ts
export const DeathCause = { LIFE: 'life', CMDR_DMG: 'cmdr_dmg', /* … */ } as const
export type DeathCause = (typeof DeathCause)[keyof typeof DeathCause]
```

Where a Zod schema exists, infer the type (`z.infer<typeof Schema>`) rather than writing it twice.

---

## Unit 3: API tests with `node:test`

```json
"test": "node --env-file=.env.test --experimental-strip-types --test \"{test,lib,services}/**/*.test.ts\""
```

- **No build, no Jest/Vitest:** Node runs the `.ts` files directly.
- **Config from [`.env.test`](../../apps/api/.env.test)**, committed and non-secret. It makes `lib/env.ts` validation pass in CI.
- **No database.** `pg.Pool` connects lazily, so the app boots without Postgres as long as no test runs a query.
- **Where tests live:** unit tests next to their source (`lib/pod-stats.test.ts`), app-level tests in `test/`.

### A unit test

From [`lib/pod-stats.test.ts`](../../apps/api/lib/pod-stats.test.ts):

```ts
import { test } from 'node:test'
import assert from 'node:assert'
import { tallyMemberRecords } from './pod-stats.ts'

test('abandoned games count toward neither wins nor games played', () => {
  const records = tallyMemberRecords([
    row(A, 'won', true, 3),
    row(A, 'won', false, 1),
    row(A, 'abandoned', false, 2),
    row(A, 'abandoned', true, 1),
  ])
  assert.deepStrictEqual(records.get(A), { wins: 3, gamesPlayed: 4 })
})
```

### App-level tests with `inject`

[`test/helper.ts`](../../apps/api/test/helper.ts) builds the real `app.ts` (all plugins and routes) via `fastify-cli`'s helper and closes it after the test:

```ts
test('unknown API routes return a normalised 404', async (t) => {
  const app = await build(t)
  const res = await app.inject({ url: '/api/does-not-exist' })
  assert.strictEqual(res.statusCode, 404)
  assert.strictEqual(res.json().error.code, 'NOT_FOUND')
})
```

For a plugin in isolation, build a minimal Fastify instance, as [`test/plugins/error-handler.test.ts`](../../apps/api/test/plugins/error-handler.test.ts) does, with routes that throw on purpose:

```ts
app.get('/crash', async () => { throw new Error('connect ECONNREFUSED 10.0.0.5:5432 (password=hunter2)') })
// …
assert.strictEqual(res.statusCode, 500)
assert.ok(!res.body.includes('hunter2'))   // internals never leak
```

---

## Unit 4: Frontend tests with Vitest

[`vitest.config.ts`](../../apps/frontend/vitest.config.ts) merges the Vite config (so `@/` aliases work) and uses **jsdom**. Tests are colocated: `lib/time.test.ts` next to `lib/time.ts`.

| Test file | Kind |
|---|---|
| `lib/game-tracker.test.ts` | Pure rules: `autoDeath`, `fmtClock`, `relDeath`, `gridForCount` |
| `lib/time.test.ts`, `lib/pod-standings.test.ts` | Pure helpers |
| `i18n/messages.test.ts` | Locale parity |
| `composables/usePlaygroupStats.test.ts` | Composable |
| `components/home/SeasonStrip.test.ts` | Component with props + i18n |
| `views/PlaygroupDetailView.test.ts` | View with mocked API, Pinia, router, i18n |

### A component test

```ts
beforeAll(() => setI18nLocale('en'))

it('shows "—" and no percent sign when the win rate is unknown', () => {
  const wrapper = mount(SeasonStrip, {
    props: { wins: 0, winrate: null, threat: 0, playgroupName: 'Tuesday' },
    global: { plugins: [i18n] },
  })
  expect(wrapper.text()).toContain('—')
  expect(wrapper.text()).not.toContain('%')
})
```

### A view test with a mocked API

[`views/PlaygroupDetailView.test.ts`](../../apps/frontend/src/views/PlaygroupDetailView.test.ts) is the template for testing a page:

```ts
type Api = typeof api

vi.mock('@/lib/api', () => ({
  api: {
    get:    vi.fn<Api['get']>(),          // typed mocks: the lint setup requires the type parameter
    post:   vi.fn<Api['post']>(),
    patch:  vi.fn<Api['patch']>(),
    delete: vi.fn<Api['delete']>(),
    upload: vi.fn<Api['upload']>(),
  },
  apiUrl: (p: string) => p,
}))

async function mountView() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/pods/:id', component: PlaygroupDetailView }] })
  await router.push(`/pods/${POD_ID}`)
  await router.isReady()
  const wrapper = mount(PlaygroupDetailView, { global: { plugins: [createPinia(), router, i18n] } })
  await flushPromises()                 // let the store's fetch resolve
  return wrapper
}

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.get).mockResolvedValue(fixture)
})

it('standings rank members by win rate over games played', async () => {
  const wrapper = await mountView()
  expect(api.get).toHaveBeenCalledWith(`/playgroups/${POD_ID}`)
  const rows = wrapper.findAllComponents(PlaygroupStandingRow)
  expect(rows.map(r => r.props('name'))).toEqual(['Ana', 'Ben', 'Cleo'])
})
```

Because **all** HTTP goes through `lib/api.ts`, mocking that one module isolates any view from the network. That's a practical payoff of the "never `fetch` in a component" rule.

---

## Unit 5: What to test

From `CLAUDE.md`: **test pure logic and anything with branching rules; no test needed for thin route handlers or trivial getters.**

| Worth a test | Not worth a test |
|---|---|
| Game rules (`autoDeath`, layout) | A handler that only calls a service |
| Stats rules (`tallyMemberRecords`, `sortStandings`) | A getter returning a ref |
| Parsing and mapping (Archidekt, bracket estimation) | Static markup |
| Security properties (error handler leak test, token crypto tamper test) | Tailwind classes |
| A view's behaviour that a bug once broke (regression) | |

**Make logic testable** by moving it out of components and services into `lib/` as pure functions, then cover the edge cases there. Issue #39 is the model: the bug was in how pod standings counted games; the fix moved the rule into `lib/pod-stats.ts` with a dedicated test file, and added a view test for the visible behaviour.

**The gap:** nothing tests SQL against a real Postgres. Until integration tests exist, keep queries simple and push decisions into tested functions (Module 10).

---

## Unit 6: Lint and format

| Tool | Config | Notes |
|---|---|---|
| **oxlint** | [`.oxlintrc.json`](../../apps/frontend/.oxlintrc.json): plugins `eslint`, `typescript`, `unicorn`, `oxc`, `vue`, `vitest`; `correctness` = error | Fast first pass |
| **ESLint** | [`eslint.config.ts`](../../apps/frontend/eslint.config.ts): Vue essential, `vueTsConfigs.recommended`, Vitest, `eslint-plugin-oxlint` (turns off rules oxlint already covers), Prettier-compat | Second pass |
| **oxfmt** | `pnpm --filter frontend format` | Formatter for `src/` |

`pnpm lint` auto-fixes; `pnpm lint:check` is what CI runs.

**ASCII quotes only** in `.vue` and `.ts` source. Curly quotes (`"` `'`) break the parsers. They're fine inside locale JSON values.

---

## Summary

- CI = `lint:check && check-types && test && build`; run it before pushing.
- API: `node:test` on raw TypeScript with `.env.test`, no DB; `app.inject` for HTTP-level tests.
- Frontend: Vitest + jsdom; mock `@/lib/api` with typed `vi.fn<…>()`; mount with Pinia, a memory router and i18n.
- Test rules and branching, extracted into pure `lib/` functions.

## Knowledge check

**1. Why can the API tests boot the full app without a database?**

- A) They use an in-memory SQLite
- B) `pg.Pool` connects lazily, and the tests only hit routes that don't query (health, 404s, plugins)
- C) CI starts Postgres
- D) Drizzle is mocked globally

<details><summary>Answer</summary>

**B.** `.env.test` satisfies env validation; no query, no connection.
</details>

**2. You're testing a view that loads data in `onMounted` through a store. What do you mock?**

- A) `window.fetch`
- B) The `@/lib/api` module, with typed `vi.fn` mocks
- C) The Pinia store
- D) Nothing; let it hit the dev API

<details><summary>Answer</summary>

**B.** All HTTP goes through `lib/api.ts`; mocking it keeps the real store logic under test.
</details>

**3. In the frontend, `const p = players.value[idx]` has which type?**

- A) `GtPlayer`
- B) `GtPlayer | undefined`, because of `noUncheckedIndexedAccess`
- C) `any`
- D) `GtPlayer | null`

<details><summary>Answer</summary>

**B.** Guard it (`if (!p) return`) before use.
</details>

**4. A colleague put a new win-streak rule directly inside a 300-line view. What's your review comment?**

- A) Fine as is
- B) Extract the rule into a pure function in `src/lib/` (or a composable over it), add unit tests for its edge cases, and split the view
- C) Add a snapshot test of the view
- D) Move it to the API

<details><summary>Answer</summary>

**B.** Pure functions are where rules get tested; components over ~200 lines should be split anyway.
</details>

**5. Which tools make up `pnpm lint:check` today?**

- A) ESLint for both apps
- B) oxlint and ESLint, frontend only
- C) Biome
- D) `tsc` only

<details><summary>Answer</summary>

**B.** The API has no lint script; it relies on `tsc --noEmit`.
</details>

---

**Next:** [Module 15: Workflow, PRs and releases →](15-workflow-and-releases.md)
