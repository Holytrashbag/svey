# Module 11: Frontend architecture

**Duration:** 45 min · **Level:** Intermediate · **Prerequisites:** [Module 2](02-architecture-and-decisions.md); Vue 3 Composition API basics

The SPA is a Vue 3 app with a strict division of labour: views compose components, stores own server data, one tiny client does all HTTP, and pure logic lives in framework-free modules. This module shows each layer with the code that defines it.

## Learning objectives

After this module you can:

- Explain the bootstrap order and why fonts are imported in `main.ts`.
- Add a route with the right guard metadata and lazy loading.
- Write a Pinia setup store action with the house `loading`/`error` pattern.
- Explain how `lib/api.ts` handles credentials, errors and `204`s, and when to use `apiUrl`.
- Keep `types/api.ts` in sync with the API.
- Explain the PWA update strategy and why it is "prompt".

---

## Unit 1: Layout of `src/`

```
apps/frontend/src/
├── main.ts            bootstrap: fonts, CSS, Pinia, i18n, router
├── App.vue            <RouterView/> + <SbUpdateToast/>
├── router/index.ts    routes + auth guard
├── views/             one per route (HomeView, GameTrackerView, …)
├── components/
│   ├── ui/            Sb* primitives (SbButton, SbAvatar, SbTabStrip, …)
│   ├── game-setup/    Gs* (GsSeatCard, GsDeckSheet, GsBottomSheet, …)
│   ├── game-tracker/  Gt* (GtPlayerTile, GtCenterBar, GtCmdrDmgSheet, …)
│   └── auth/ decks/ home/ legal/ playgroups/
├── stores/            Pinia: useDeckStore, useGameStore, usePlaygroupStore, …
├── composables/       useFormat, useNav, usePlaygroupStats, useClickOutside
├── lib/               framework-free: api, auth-client, game-tracker, time, mtg, pod-standings, …
├── i18n/              setup, locale detection, formats, locales/{en,de}/*.json
├── types/api.ts       every API request/response type
└── style.css          Tailwind import + @theme design tokens
```

| Layer | Owns | Rule |
|---|---|---|
| **views/** | Page composition, route params, calling store actions | No `fetch`; delegate data to stores |
| **components/** | Presentation and interaction | Props in, events out; one component per file, split past ~200 lines |
| **stores/** | Server data, `loading`/`error`, domain UI state | All async work in actions |
| **lib/** | Pure logic and the HTTP client | No Vue imports (except `auth-client.ts`, which wraps Better Auth's Vue client); unit-testable |
| **composables/** | Reusable reactive logic | Thin wrappers over `lib/` + Vue/i18n |

---

## Unit 2: Bootstrap

[`main.ts`](../../apps/frontend/src/main.ts):

```ts
// Self-hosted fonts (bundled by Vite): no external request to Google's CDN,
// so no visitor IP is sent to Google.
import '@fontsource/space-grotesk/400.css'
// … manrope, jetbrains-mono weights
import './style.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
app.mount('#app')
```

Pinia is installed before the router because route guards and views use stores; i18n before the router so the first view renders translated.

---

## Unit 3: Routing and guards

[`router/index.ts`](../../apps/frontend/src/router/index.ts):

```ts
declare module 'vue-router' {
  interface RouteMeta { requiresAuth?: boolean; guestOnly?: boolean }
}

routes: [
  { path: '/',     component: AuthView, meta: { guestOnly: true } },   // OAuth lands here
  { path: '/auth', component: AuthView, meta: { guestOnly: true } },
  { path: '/home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
  // … /decks, /decks/add, /decks/:id
  // … /pods, /pods/:id, /pods/:id/members
  // … /pods/:id/game, /pods/:id/game/tracker, /pods/:id/game/survey
  // … /games/:id, /profile
  { path: '/reset-password', component: () => import('@/views/ResetPasswordView.vue') },   // public
  { path: '/impressum' … }, { path: '/datenschutz' … }, { path: '/terms' … },              // public
]

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.guestOnly) return
  try {
    const { data: session } = await authClient.getSession()
    if (to.meta.requiresAuth && !session) return '/auth'
    if (to.meta.guestOnly && session)    return '/home'
  } catch {
    if (to.meta.requiresAuth) return '/auth'
  }
})
```

- Every view except `AuthView` is **lazy-loaded** (`() => import(...)`), so each becomes its own chunk.
- `RouteMeta` is typed through module augmentation, so a typo like `requireAuth` fails type-checking.
- Public routes have no meta and skip the session lookup entirely.
- Playgroups use the `/pods` prefix in the UI; the API says `/playgroups`.

---

## Unit 4: The API client

All HTTP goes through [`lib/api.ts`](../../apps/frontend/src/lib/api.ts). Never call `fetch` from a component.

```ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: 'include',                       // send the session cookie
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw await extractError(res)      // reads { error: { message } }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                     => request<T>('GET', path),
  post:   <T>(path: string, body: unknown)      => request<T>('POST', path, body),
  patch:  <T>(path: string, body: unknown)      => request<T>('PATCH', path, body),
  delete: <T>(path: string)                     => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
}

export function apiUrl(path: string): string { return `${BASE}/api${path}` }
```

- Paths are written **without** `/api`: `api.get('/decks')`.
- A non-2xx response throws an `Error` whose message is the server's `error.message` (English, see the known gap in Module 13).
- `upload` sends `FormData` without a `Content-Type` header so the browser sets the multipart boundary.
- `apiUrl` is for resources the browser fetches itself, such as `<img :src="apiUrl('/cards/art?…')">`.
- The generic `T` is a *promise*, not a check: nothing validates the response at runtime. That's why `types/api.ts` must stay accurate.

---

## Unit 5: Pinia stores

Stores use the **setup-store** syntax. [`useGameStore`](../../apps/frontend/src/stores/useGameStore.ts) is the smallest complete example:

```ts
export const useGameStore = defineStore('games', () => {
  const activeGame    = ref<GameDetail | null>(null)
  const detailLoading = ref(false)
  const detailError   = ref<string | null>(null)
  const createLoading = ref(false)
  const createError   = ref<string | null>(null)

  async function fetchGameDetail(id: string) {
    detailLoading.value = true
    detailError.value   = null
    try {
      activeGame.value = await api.get<GameDetail>(`/games/${id}`)
    } catch (e) {
      detailError.value = e instanceof Error ? e.message : 'Failed to load game'
    } finally {
      detailLoading.value = false
    }
  }

  async function createGame(body: CreateGameBody): Promise<string> {
    createLoading.value = true
    createError.value   = null
    try {
      const res = await api.post<{ id: string }>('/games', body)
      return res.id
    } catch (e) {
      createError.value = e instanceof Error ? e.message : 'Failed to save game'
      throw e                       // caller needs to know (e.g. to re-enable a button)
    } finally {
      createLoading.value = false
    }
  }

  return { activeGame, detailLoading, detailError, createLoading, createError, fetchGameDetail, createGame }
})
```

Patterns to follow:

| Pattern | Detail |
|---|---|
| **One `loading`/`error` pair per operation** | `detailLoading`, `createLoading`, … so a save spinner doesn't blank the page |
| **Load actions usually swallow, mutations usually re-throw** | Views render `xxxError` for loads; most mutations throw so the caller can react (stay on the page, re-enable a button). A few older actions (e.g. `acceptInvite`) only set `error`; check before relying on a throw |
| **Local update after a mutation** | e.g. `removeMember` filters `currentPlaygroup.members` instead of refetching |
| **State changes only inside actions** | Views call actions; they don't assign to store refs |
| **Types come from `types/api.ts`** | Stores re-export them for convenience (`export type { GameDetail } from '@/types/api'`) |

Stores: `useCardStore` (illustrator cache), `useDeckStore`, `useGameStore`, `useLocaleStore`, `useNotificationStore`, `usePlaygroupStore`, `useProfileStore`.

---

## Unit 6: `types/api.ts`, the contract

[`types/api.ts`](../../apps/frontend/src/types/api.ts) opens with:

```ts
// Single source of truth for all API request/response shapes.
// Stores import from here; never define duplicate types in store files.
```

There is no shared package, so these types are a **hand-maintained mirror** of the service types in `apps/api/services/*.ts` (e.g. `PlaygroupDetail`, `DeckStats`, `CreateGameBody`). When you change a service return type, update this file in the same PR, and the type-checker will show you every component that needs to follow.

---

## Unit 7: PWA and updates

[`vite.config.ts`](../../apps/frontend/vite.config.ts) configures `vite-plugin-pwa`:

```ts
VitePWA({
  // 'prompt' never force-reloads: a new build is only applied when the
  // user taps "Reload" in the update toast — safe during a live game.
  registerType: 'prompt',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],   // app shell + fonts offline
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],         // never answer API calls from the SW
  },
  devOptions: { enabled: false },                                   // test with `vite preview`
})
```

[`SbUpdateToast.vue`](../../apps/frontend/src/components/ui/SbUpdateToast.vue) uses `useRegisterSW()` and shows "A new version is available" with a Reload button. Caddy serves `/sw.js`, `/index.html` and the manifest with `Cache-Control: no-cache` so new deploys are discovered, and hashed `/assets/*` as immutable for a year (Module 16).

Why `prompt` and not `autoUpdate`? An automatic reload during a game would wipe the in-memory tracker state.

---

## Unit 8: Component conventions

From `CLAUDE.md`, enforced in review:

- Always `<script setup lang="ts">`. No Options API, no `defineComponent`.
- `defineProps<{ … }>()` and `defineEmits<{ close: []; change: [attackerSeatIdx: number, dmg: number] }>()` with types, `withDefaults` for defaults.
- `defineModel()` for two-way binding in form components.
- File names in PascalCase with the prefix for the area: `Sb` (primitives), `Gs` (game setup), `Gt` (game tracker).
- Tailwind only; `<style scoped>` only for animations or third-party overrides.
- Frontend TypeScript uses `noUncheckedIndexedAccess`: `players.value[idx]` is `GtPlayer | undefined`. Narrow with a real guard (`const p = players.value[idx]; if (!p) return`); use `!` only when presence is provable.

---

## Summary

- Views → stores → `lib/api.ts`; pure logic in `lib/`; types in `types/api.ts`.
- Routes are lazy-loaded and guarded by `requiresAuth` / `guestOnly` meta.
- `api.*` sends cookies, throws the server's error message, handles `204`; use `apiUrl` for `<img>`.
- Stores keep a `loading`/`error` pair per operation; mutations re-throw.
- The service worker updates only on the user's tap, to protect live games.

## Knowledge check

**1. A component needs the list of notifications. What's the right approach?**

- A) `fetch('/api/notifications')` in `onMounted`
- B) Call the notification store's action and read its state
- C) Import `api` directly in the component
- D) Read it from `localStorage`

<details><summary>Answer</summary>

**B.** Components never fetch; stores own server data and loading/error state.
</details>

**2. You add `/seasons` and want it visible only to signed-in users. What do you add?**

- A) A check in the view's `onMounted`
- B) `meta: { requiresAuth: true }` on the route; the global guard redirects to `/auth`
- C) A Caddy rule
- D) Nothing; all routes are protected

<details><summary>Answer</summary>

**B.** And remember the API must protect the data too, with `requireAuth`.
</details>

**3. The API returns 409 `{ error: { code: 'CONFLICT', message: 'You have already imported this deck.' } }`. What does `api.post` do?**

- A) Resolves with the JSON
- B) Throws an `Error` with message "You have already imported this deck."
- C) Throws "Request failed: 409"
- D) Retries once

<details><summary>Answer</summary>

**B.** `extractError` prefers `error.message` and falls back to "Request failed: <status>".
</details>

**4. Why is the PWA `registerType` set to `'prompt'`?**

- A) It's faster
- B) An automatic reload during a game would wipe the in-memory tracker state; the user decides when to reload
- C) iOS requires it
- D) To disable offline mode

<details><summary>Answer</summary>

**B.**
</details>

**5. You changed `PlaygroupMemberDetail` in `playgroup.service.ts` to add `losses`. What else must change for the frontend to use it safely?**

- A) Nothing; types are shared
- B) Add `losses` to `PlaygroupMemberDetail` in `apps/frontend/src/types/api.ts`
- C) Regenerate an OpenAPI client
- D) Add a Zod response schema on the frontend

<details><summary>Answer</summary>

**B.** The frontend types are a manual mirror.
</details>

---

**Next:** [Module 12: The game session flow →](12-game-session-flow.md)
