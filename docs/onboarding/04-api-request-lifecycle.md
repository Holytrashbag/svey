# Module 4: The API request lifecycle

**Duration:** 50 min · **Level:** Intermediate · **Prerequisites:** [Module 3](03-local-setup.md); basic Fastify or Express knowledge helps

Follow one HTTP request from the socket to the response: how the Fastify app boots, how routes are discovered, how a request is validated and authenticated, and how every error ends up in the same JSON envelope.

## Learning objectives

After this module you can:

- Explain the boot sequence `server.ts` → `app.ts` → autoloaded plugins and routes.
- Explain why plugins are wrapped in `fastify-plugin` and route files are not.
- Write a route file the house way: Zod schemas, `withTypeProvider`, `requireAuth`, a service call, an explicit status code.
- Trace any error to the `{ error: { code, message } }` envelope.
- Find any endpoint in the catalogue and the service behind it.

---

## Unit 1: Boot sequence

[`server.ts`](../../apps/api/server.ts) creates the Fastify instance and listens:

```ts
const server = Fastify({
  logger: {
    level: 'info',
    // Data minimisation (Art. 5/32 DSGVO): in production keep per-request logs
    // for operations but strip the client IP and port …
    ...(isProd
      ? { redact: { paths: ['req.remoteAddress', 'req.remotePort'], remove: true } }
      : {}),
  },
})
server.register(app)
server.listen({ port: env.PORT, host: '0.0.0.0' }, …)
```

[`app.ts`](../../apps/api/app.ts) is the application plugin. It does three things:

```ts
const app: FastifyPluginAsync<AppOptions> = async (fastify, opts) => {
  // 1. Zod is the validator AND the serializer for every route
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // 2. Global plugins at the root
  void fastify.register(AutoLoad, { dir: path.join(__dirname, 'plugins'), options: opts, forceESM: true })

  // 3. All routes under /api
  void fastify.register(async (api) => {
    void api.register(AutoLoad, { dir: path.join(__dirname, 'routes'), options: opts, forceESM: true })
  }, { prefix: '/api' })
}
```

Keeping `app.ts` separate from `server.ts` is what makes the app testable: tests build `app.ts` and call `app.inject()` without opening a port (Module 14).

---

## Unit 2: Plugins, encapsulation and `fastify-plugin`

Fastify **encapsulates** plugins: hooks, decorators and handlers registered inside a plugin apply only to that plugin and its children. That's useful for route files and wrong for app-wide concerns.

Each file in [`plugins/`](../../apps/api/plugins) is wrapped with `fp(...)` from `fastify-plugin`, which removes the encapsulation boundary so its effect reaches the whole app:

| Plugin | Effect |
|---|---|
| [`cors.ts`](../../apps/api/plugins/cors.ts) | Allows `FRONTEND_URL` and `localhost:5173` with credentials (dev only in practice) |
| [`error-handler.ts`](../../apps/api/plugins/error-handler.ts) | `setErrorHandler` + `setNotFoundHandler` for the whole app (Unit 5) |
| [`uploads.ts`](../../apps/api/plugins/uploads.ts) | Multipart (5 MB, 1 file) and static files from `UPLOADS_DIR` at **`/uploads/`**, outside `/api` |
| [`scheduled-jobs.ts`](../../apps/api/plugins/scheduled-jobs.ts) | Nightly orphan cleanup at 03:30 Europe/Berlin (skipped when `NODE_ENV=test`) |

Route files are **not** wrapped in `fp`. So when a route file does `f.addHook('preHandler', requireAuth)`, the hook applies to that file's routes only. That's how `/api/cards/*` stays public while `/api/decks/*` requires a session.

### How autoload maps files to URLs

`@fastify/autoload` turns **directories** into prefixes. Files at the root of `routes/` get no extra prefix:

| File | Mounted at |
|---|---|
| `routes/root.ts` | `/api/health` |
| `routes/auth.ts` | `/api/auth/*`, `/api/me` |
| `routes/games/index.ts` | `/api/games/...` |
| `routes/decks/index.ts` | `/api/decks/...` |
| `routes/playgroups/index.ts` | `/api/playgroups/...` |

To add a domain, create `routes/<domain>/index.ts` exporting a `FastifyPluginAsync`. No registration code needed.

---

## Unit 3: Anatomy of a route file

[`routes/games/index.ts`](../../apps/api/routes/games/index.ts) is the reference example:

```ts
const CreateGameSchema = z.object({
  podId:       z.string().uuid(),
  durationSec: z.number().int().min(0),
  endReason:   z.enum(['won', 'draw', 'abandoned']),
  abandonReasons: z.array(z.string().max(32)).max(10).optional(),
  players:     z.array(CreateGamePlayerSchema).min(2),
})

const IdParamsSchema = z.object({ id: z.string().uuid() })

const games: FastifyPluginAsync = async (fastify) => {
  const f = fastify.withTypeProvider<ZodTypeProvider>()   // ①
  f.addHook('preHandler', requireAuth)                    // ②

  f.post('/', { schema: { body: CreateGameSchema } }, async (request, reply) => {   // ③
    const gameId = await gameService.createGame(db, request.user.id, request.body)  // ④
    return reply.code(201).send({ id: gameId })                                     // ⑤
  })

  f.delete('/:id', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    await gameService.deleteGame(db, request.params.id, request.user.id)
    return reply.code(204).send()
  })
}
export default games
```

1. **`withTypeProvider<ZodTypeProvider>()`** makes `request.body`, `request.params` and `request.query` typed from the Zod schemas. Without it they'd be `unknown`.
2. **`requireAuth`** runs before every handler in this file and puts the user on `request.user`.
3. **Schemas** validate before your handler runs. Invalid input never reaches the service; Fastify returns a 400.
4. **One service call.** The handler passes the `db` handle, the authenticated user id, and validated input.
5. **Explicit status:** `201` for creates, `204` for empty responses, default `200` otherwise.

That's the whole job of a handler. If you find yourself writing an `if` about permissions or data in a handler, it belongs in the service.

---

## Unit 4: Authentication on the request

[`lib/require-auth.ts`](../../apps/api/lib/require-auth.ts):

```ts
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
  if (!session) throw Errors.unauthorized('Not authenticated')
  request.user = session.user
}

declare module 'fastify' {
  interface FastifyRequest {
    user: typeof auth.$Infer.Session.user
  }
}
```

- Better Auth reads the session cookie from the headers and looks the session up in the `session` table.
- Throwing `Errors.unauthorized` produces a 401 in the standard envelope (Unit 5).
- The `declare module` block is TypeScript **module augmentation**: it teaches Fastify's types that `request.user` exists, with Better Auth's inferred user type (`id`, `name`, `email`, `image`, …).

### The Better Auth bridge

Better Auth speaks the Fetch API (`Request` → `Response`), Fastify speaks Node. [`routes/auth.ts`](../../apps/api/routes/auth.ts) translates between them for every `GET|POST /api/auth/*`:

```ts
const req = new Request(url.toString(), {
  method: request.method,
  headers: fromNodeHeaders(request.headers),
  ...(request.body ? { body: JSON.stringify(request.body) } : {}),
})
const response = await auth.handler(req)
reply.status(response.status)

// getSetCookie() returns each Set-Cookie separately; Headers.forEach() would collapse them
const setCookies = response.headers.getSetCookie?.()
if (setCookies?.length) reply.header('Set-Cookie', setCookies)

response.headers.forEach((value, key) => {
  if (key.toLowerCase() === 'set-cookie') return
  if (key.toLowerCase().startsWith('access-control-')) return   // @fastify/cors owns CORS
  reply.header(key, value)
})
```

Two subtle details: multiple `Set-Cookie` headers must stay separate (sign-in sets more than one cookie), and CORS headers from Better Auth are dropped so they don't conflict with `@fastify/cors`.

---

## Unit 5: The error envelope

Every error response has the same shape:

```json
{ "error": { "code": "FORBIDDEN", "message": "Not a member of this playgroup" } }
```

[`plugins/error-handler.ts`](../../apps/api/plugins/error-handler.ts) decides what to return:

```ts
fastify.setErrorHandler((err: unknown, request, reply) => {
  if (err instanceof AppError) {                                     // ① domain error
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } })
  }
  const status = clientStatus(err)                                   // ② framework 4xx
  if (status !== null && err instanceof Error) {
    const code = CLIENT_ERROR_CODES[status] ?? 'BAD_REQUEST'
    return reply.code(status).send({ error: { code, message: err.message } })
  }
  request.log.error(err)                                             // ③ anything else
  return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
})

fastify.setNotFoundHandler((request, reply) =>                       // ④ unknown routes
  reply.code(404).send({ error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` } }))
```

1. **`AppError`** ([`lib/errors.ts`](../../apps/api/lib/errors.ts)) is thrown deliberately by services through the `Errors` factory: `notFound` 404, `unauthorized` 401, `forbidden` 403, `badRequest` 400, `conflict` 409. Its message is meant for users.
2. **Framework 4xx errors** (Zod validation, malformed JSON, multipart 413) describe the *request*, so their messages are safe to return.
3. **Everything else** is a bug or an outage (a DB error, a `TypeError`). It is logged with the stack and the client gets a generic 500. The test suite asserts that a crash message containing `password=hunter2` never reaches the response body.
4. **Unknown routes** use the same envelope.

The frontend relies on this shape: [`lib/api.ts`](../../apps/frontend/src/lib/api.ts) reads `error.message` and throws it as an `Error`, which stores show to the user.

---

## Unit 6: Endpoint catalogue

All paths are under `/api` unless noted. "Auth" means `requireAuth` runs.

| Method | Path | Auth | Service | Returns |
|---|---|---|---|---|
| GET | `/health` | – | – | `{ status: 'ok' }` |
| GET, POST | `/auth/*` | – | Better Auth | sign-in, sign-up, sessions, OAuth callbacks, reset |
| GET | `/me` | session | Better Auth | session or 401 |
| GET | `/cards/art?oracleId\|name&version` | **public** | `lib/scryfall.getCardArt` | image bytes |
| GET | `/cards/meta?oracleId\|name` | **public** | `lib/scryfall.getCardMeta` | `{ artist }` |
| POST | `/decks/import` `{ url }` | ✓ | `deck.importDeck` | 201 `{ id }` |
| GET | `/decks` | ✓ | `deck.listDecks` | `{ decks }` |
| GET | `/decks/:id` | ✓ | `deck.getDeckDetail` | `DeckDetail` |
| POST | `/decks/:id/sync` | ✓ | `deck.syncDeck` | `DeckDetail` |
| GET | `/decks/:id/stats` | ✓ | `stats.getDeckStats` | `{ mine, general }` |
| PATCH | `/decks/:id` `{ name?, bracketOverride?, isArchived? }` | ✓ | `deck.updateDeck` | `{ id }` |
| POST | `/games` | ✓ | `game.createGame` | 201 `{ id }` |
| GET | `/games/:id` | ✓ | `game.getGameDetail` | `GameDetail` |
| DELETE | `/games/:id` | ✓ | `game.deleteGame` | 204 |
| GET | `/notifications` | ✓ | `notification.list…` + `getUnreadCount` | `{ notifications, unreadCount }` |
| POST | `/notifications/read-all` | ✓ | `notification.markAllRead` | 204 |
| POST | `/notifications/:id/read` | ✓ | `notification.markRead` | 204 |
| GET | `/playgroups` | ✓ | `playgroup.listPlaygroups` | `{ active, pending }` |
| POST | `/playgroups` `{ name }` | ✓ | `playgroup.createPlaygroup` | 201 `{ id, inviteCode }` |
| POST | `/playgroups/join` `{ code }` | ✓ | `playgroup.joinPlaygroup` | `{ playgroupId }` |
| GET | `/playgroups/:id` | ✓ | `playgroup.getPlaygroupDetail` | `PlaygroupDetail` |
| PATCH | `/playgroups/:id/members/:memberId` `{ accept? \| approve? \| role? }` | ✓ | `acceptInvite` / `approveMember` / `updateMemberRole` | 204 |
| DELETE | `/playgroups/:id/members/:memberId` | ✓ | `playgroup.removeMember` | 204 |
| GET | `/playgroups/:id/pending` | ✓ | `playgroup.listPendingMembers` | `PendingMemberItem[]` |
| POST | `/playgroups/:id/regenerate-invite` | ✓ | `playgroup.regenerateInviteCode` | `{ code }` |
| POST | `/playgroups/:id/transfer-owner` `{ memberId }` | ✓ | `playgroup.transferOwnership` | 204 |
| GET | `/users/me/stats` | ✓ | `stats.getPlayerStats` | `PlayerStats` |
| GET | `/users/me/deck-stats` | ✓ | `stats.getPlayerDeckStats` | `{ deckStats }` |
| POST | `/users/me/avatar` (multipart) | ✓ | *inline in route* | `{ avatarUrl }` |
| GET | **`/uploads/*`** (no `/api`) | – | `@fastify/static` | avatar files |

### Exceptions you'll meet

The conventions above are followed almost everywhere. Three places deviate; know them so you don't copy them:

- **`GET /api/me`** answers 401 with `{ error: 'Unauthorized' }`, not the standard envelope.
- **`POST /api/users/me/avatar`** keeps its file handling and a Drizzle update inline in the route, using a local `pgTable('user', …)` handle. A service would be the conventional home.
- **The `PATCH …/members/:memberId` handler** chooses between three service calls based on the body (`accept`, `approve` or `role`). It's plain dispatch with no rules in it, but it is the only handler that picks between services.

---

## Summary

- `server.ts` listens; `app.ts` wires Zod, autoloads `plugins/` at the root and `routes/` under `/api`.
- `fp()` makes a plugin global; route files stay encapsulated, so their hooks are local.
- A handler is: schema → `requireAuth` → one service call → explicit status.
- `AppError` → its status; framework 4xx → passed through; anything else → logged, generic 500.

## Knowledge check

**1. You add `f.addHook('preHandler', requireAuth)` in `routes/cards/index.ts`. Which routes now require a session?**

- A) Every route in the app
- B) Only the routes in `routes/cards/index.ts`
- C) Every route under `/api`
- D) None; hooks only work in plugins

<details><summary>Answer</summary>

**B.** Route files are encapsulated (not wrapped in `fp`), so the hook applies to that file's routes only. (Don't actually do this: the card routes are public on purpose.)
</details>

**2. A service hits a Postgres deadlock and the driver throws. What does the client receive?**

- A) 409 with the Postgres message
- B) 500 `{ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }`, and the error is logged
- C) 400 `BAD_REQUEST`
- D) The raw stack trace in development

<details><summary>Answer</summary>

**B.** It's not an `AppError` and has no 4xx `statusCode`, so the handler logs it and returns a generic 500. Internal messages never leak.
</details>

**3. Where does `request.user` get its TypeScript type?**

- A) From a Zod schema
- B) From module augmentation in `lib/require-auth.ts`, using Better Auth's inferred session user type
- C) From `db/schema.ts`
- D) It's `any`

<details><summary>Answer</summary>

**B.** `declare module 'fastify' { interface FastifyRequest { user: typeof auth.$Infer.Session.user } }`.
</details>

**4. You create `routes/seasons/index.ts` with `f.get('/', …)`. What URL serves it?**

- A) `/seasons`
- B) `/api/seasons`
- C) `/api/routes/seasons`
- D) Nothing until you register it in `app.ts`

<details><summary>Answer</summary>

**B.** Autoload uses the directory name as a prefix, inside the `/api`-prefixed scope.
</details>

**5. Why does the auth bridge use `response.headers.getSetCookie()` instead of copying headers in `forEach`?**

- A) It's faster
- B) `forEach` would merge multiple `Set-Cookie` headers into one, breaking cookies
- C) Better Auth doesn't set cookies through headers
- D) To strip cookies in production

<details><summary>Answer</summary>

**B.** `Set-Cookie` can't be comma-joined safely. `getSetCookie()` returns each one separately.
</details>

---

**Next:** [Module 5: Services and authorization →](05-services-and-authorization.md)
