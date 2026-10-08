# Module 6: The database schema

**Duration:** 50 min · **Level:** Intermediate · **Prerequisites:** [Module 5](05-services-and-authorization.md); SQL basics

Most bugs in data-heavy apps come from misreading what a column *means*, especially when it's nullable. This module walks the whole schema and spells out the semantics the code depends on.

## Learning objectives

After this module you can:

- Draw the entity relationships between users, pods, members, decks, games, players and surveys.
- Explain the two schema owners (Better Auth vs. the app) and how they're mapped.
- Interpret every nullable foreign key: `playgroup_member.user_id`, `game_player.playgroup_member_id`.
- Predict what a `DELETE` cascades to, and what it is blocked by.
- Identify the schema objects that exist but aren't used yet.

---

## Unit 1: Two owners, one database

| Owner | Tables | Defined in | Read from code via |
|---|---|---|---|
| **Better Auth** | `user`, `session`, `oauth_account`, `verification` | [`000_better_auth_schema.sql`](../../apps/api/db/migrations/000_better_auth_schema.sql) (+ `005`, `006`) | Better Auth itself; local read-only `pgTable('user', …)` handles where the app needs a column |
| **The app** | everything else | [`001_initial_schema.sql`](../../apps/api/db/migrations/001_initial_schema.sql) onward, mirrored in [`db/schema.ts`](../../apps/api/db/schema.ts) | `import { game, gamePlayer, … } from '../db/schema.ts'` |

Better Auth's defaults are camelCase; Svey's database is snake_case. [`lib/auth.ts`](../../apps/api/lib/auth.ts) maps every field:

```ts
user: {
  fields: { name: 'display_name', image: 'avatar_url', emailVerified: 'email_verified', … },
},
account: {
  modelName: 'oauth_account',
  fields: { userId: 'user_id', accountId: 'provider_account_id', providerId: 'provider', … },
},
```

So in code you'll see `session.user.name`, and in SQL `"user".display_name`. Note also that `user` is a reserved word in Postgres and must be quoted in SQL: `"user"`.

> `schema.ts` doesn't declare foreign keys to `"user"` (the table isn't in it), but the SQL does. For example `playgroup.created_by` has `REFERENCES "user"(id)` in SQL and is a plain `uuid` in Drizzle. **When they differ, the SQL is the truth.**

---

## Unit 2: Entity relationships

```mermaid
erDiagram
  USER ||--o{ PLAYGROUP_MEMBER : "user_id (nullable)"
  USER ||--o{ DECK : "owner_user_id"
  USER ||--o{ GAME : "host_user_id"
  USER ||--o{ PLAYGROUP : "created_by (owner)"
  USER ||--o{ NOTIFICATION : "user_id"
  PLAYGROUP ||--o{ PLAYGROUP_MEMBER : "cascade"
  PLAYGROUP ||--o{ GAME : "no cascade"
  DECK ||--o{ DECKLIST_CARD : "cascade"
  GAME ||--o{ GAME_PLAYER : "cascade"
  PLAYGROUP_MEMBER |o--o{ GAME_PLAYER : "set null"
  DECK ||--o{ GAME_PLAYER : "restrict"
  GAME_PLAYER ||--o| SURVEY_RESPONSE : "cascade"
  GAME ||--o{ SURVEY_RESPONSE : "cascade"
  GAME ||--o{ GAME_DECKLIST_CARD : "cascade (unused)"
  GAME ||--o{ COMMANDER_DAMAGE : "cascade (unused)"
  PLAYGROUP |o--o{ NOTIFICATION : "cascade"
  DECK |o--o{ NOTIFICATION : "cascade"
```

---

## Unit 3: Table by table

### `playgroup`

| Column | Notes |
|---|---|
| `id` uuid | `gen_random_uuid()` (from `pgcrypto`), like every id |
| `name`, `description` | `description` is not used by the UI yet |
| `invite_code` text **unique** | Format `SPELL-XXXX-NN`, alphabet without `I`, `O`, `0`, `1` to avoid misreading (`generateInviteCode`) |
| `created_by` uuid → `"user"` | The **owner** (Module 5) |
| `created_at` | Shown as "founded" |

### `playgroup_member`

| Column | Notes |
|---|---|
| `playgroup_id` → `playgroup` | `ON DELETE CASCADE` |
| `user_id` uuid **nullable** → `"user"` | `ON DELETE SET NULL`. **Always handle null.** A membership row can exist without an account |
| `display_name` | Copied from the user's name at join time; the pod shows this name |
| `role` | enum `playgroup_member_role`: `admin` \| `member` |
| `is_pending` | Pending rows don't count for access or stats |
| `joined_at` | |
| **unique** `(playgroup_id, user_id)` | One membership per user per pod. (Postgres treats NULLs as distinct, so several account-less rows are allowed) |

### `deck` and `decklist_card`

| Column | Notes |
|---|---|
| `deck.owner_user_id` → `"user"` | Decks belong to a **user**, not a pod. `ON DELETE CASCADE` in SQL, which is why account deletion reassigns used decks first (Module 8) |
| `deck.archidekt_id` | Upstream id; one import per owner per Archidekt deck (409 otherwise) |
| `deck.bracket_estimated` / `bracket_override` | Effective bracket = `override ?? estimated` |
| `deck.archidekt_deleted` | Set when sync gets a 404 upstream. The deck is **never** auto-deleted |
| `deck.is_archived` | Hidden from game setup |
| `deck.color_identity` `text[]` | e.g. `{U,B}`, ordered WUBRG |
| `decklist_card.scryfall_id` | Holds Scryfall's **oracle_id** (from Archidekt's `oracleCard.uid`), *not* a Scryfall card id |
| `decklist_card.is_commander`, `quantity`, `card_type`, `mana_cost`, `cmc`, `salt_score` | Replaced wholesale on every sync |

### `game`

| Column | Notes |
|---|---|
| `playgroup_id` → `playgroup` | **No cascade.** Deleting a pod requires deleting its games first (the cleanup job does this) |
| `host_user_id` → `"user"` | Whoever saved the game |
| `status` | enum `game_status`: `active` \| `completed`. Every saved game is inserted as `completed`; `active` is unused |
| `end_reason` | enum `game_end_reason`: `won` \| `draw` \| `abandoned` |
| `abandon_reasons` jsonb | Array of reason ids, e.g. `["time","stall"]`, only for `abandoned` |
| `abandon_notes` | Free text typed in the retire sheet (≤ 500 chars), only for `abandoned`. Shown on the recap to pod members |
| `duration_seconds`, `started_at`, `ended_at` | The API sets `ended_at = now()` and `started_at = now() − duration` when the game is saved |

### `game_player`

| Column | Notes |
|---|---|
| `game_id` → `game` | `ON DELETE CASCADE` |
| `playgroup_member_id` **nullable** → `playgroup_member` | `ON DELETE SET NULL`. **null = guest, or a member who was removed or deleted their account** |
| `guest_name` | Set for guests, and overwritten with `'Deleted player'` on account deletion |
| `deck_id` → `deck` | **Restrict** (no `ON DELETE`): a deck used in any game can't be deleted |
| `turn_order` | Seat index from setup (0-based) |
| `final_life`, `poison_counters` | Final state from the tracker |
| `death_cause` | enum `death_cause`: `life` \| `cmdr_dmg` \| `poison` \| `conceded` \| `special` \| `none` |
| `died_at` | Timestamp of elimination; `null` for survivors |
| `is_winner` | Set by the client for the last player standing in a `won` game |

### `survey_response`

| Column | Notes |
|---|---|
| `game_id`, `game_player_id` | Both cascade; **unique** `(game_id, game_player_id)` → at most one response per seat |
| `fun_rating`, `agency_rating` | Nullable, with `CHECK … BETWEEN 1 AND 5` |
| `takeaway` | Free text, nullable. Shown on the game recap to every pod member |
| | A row is only inserted if the player answered at least one question; skipped players have **no row** |

### `notification`

| Column | Notes |
|---|---|
| `user_id` → `"user"` | Cascade |
| `type` | enum `notification_type`: `member_joined` \| `member_approved` \| `role_changed` \| `deck_archidekt_deleted` |
| `title`, `body` | English fallbacks |
| `params` jsonb | Interpolation values; the client renders localised text from `type` + `params` |
| `playgroup_id`, `deck_id` | Optional links; cascade |
| `read_at` | `null` = unread |
| Indexes | `(user_id, created_at DESC)` for the feed; **partial** index `(user_id) WHERE read_at IS NULL` for the unread badge |

### Bookkeeping

- **`_migrations`** (`filename`, `applied_at`) is created by the migration runner (Module 7).
- **The sentinel user** `00000000-0000-0000-0000-000000000000` ("Deleted player", `deleted-account@svey.invalid`) is inserted by [`005_seed_deleted_user.sql`](../../apps/api/db/migrations/005_seed_deleted_user.sql). It owns records that must survive an account deletion. It has no password and no OAuth account, so nobody can sign in as it. The constant is `DELETED_USER_ID` in [`lib/constants.ts`](../../apps/api/lib/constants.ts).

---

## Unit 4: Who is in a seat?

The single most important piece of nullable logic. Given a `game_player` row:

| `playgroup_member_id` | `guest_name` | Meaning | Recap shows |
|---|---|---|---|
| set | null | A pod member | the member's `display_name` |
| null | `"Lena"` | A guest | `Lena` |
| null | `"Deleted player"` | A member whose account was deleted | `Deleted player` |
| null | null | A member who was **removed** from the pod (the FK set it to null) | `Guest` (fallback in `getGameDetail`) |

Stats queries filter on `playgroup_member_id IS NOT NULL` or join to `playgroup_member`, so guests and removed members never appear in standings.

---

## Unit 5: Cascades and blockers

What happens when you delete a row:

| Delete… | Cascades to | Sets null | Blocked by |
|---|---|---|---|
| `"user"` | `session`, `oauth_account`, `deck` (!), `notification` | `playgroup_member.user_id` | `game.host_user_id`, `playgroup.created_by` (no `ON DELETE`) |
| `playgroup` | `playgroup_member`, `notification` | | `game.playgroup_id` |
| `game` | `game_player` → `survey_response`; `game_decklist_card`; `commander_damage` | | |
| `deck` | `decklist_card`, `notification` | | `game_player.deck_id`, `game_decklist_card.deck_id` |
| `playgroup_member` | | `game_player.playgroup_member_id` | |

This table explains two pieces of code you'll read in Module 8:

- **Account deletion** must move `game.host_user_id`, `playgroup.created_by` and used decks to the sentinel user *before* Better Auth deletes the user, or the delete would fail (blockers) or destroy history (the deck cascade).
- **The cleanup job** deletes a pod's games *before* the pod, because `game.playgroup_id` doesn't cascade.

---

## Unit 6: Things that exist but aren't used (yet)

| Object | Status |
|---|---|
| `game_decklist_card`, `commander_damage` | In the schema, never written. Intended for decklist snapshots and per-commander damage history |
| `game.status = 'active'` | Every saved game is `completed` |
| `playgroup.description` | Never written |
| Views `deck_stat_view`, `player_stat_view` (from `001`) | Exist in the database; services don't query them. Stats are computed in `stats.service.ts` and `playgroup.service.ts` (Module 10). They are plain views, so they cost nothing |

Before building on any of these, check how they should behave. They were designed before the current stats rules.

---

## Try it

With the demo data loaded (`pnpm --filter api db:studio` or `psql postgresql://postgres:postgres@localhost:5432/svey`):

```sql
-- 1. Every seat and how it resolves to a name
select g.started_at::date, gp.turn_order, pm.display_name, gp.guest_name, gp.death_cause, gp.is_winner
from game_player gp
join game g on g.id = gp.game_id
left join playgroup_member pm on pm.id = gp.playgroup_member_id
order by g.started_at desc, gp.turn_order
limit 20;

-- 2. Which decks can't be deleted right now?
select d.name, count(*) as games
from deck d join game_player gp on gp.deck_id = d.id
group by d.name order by games desc;

-- 3. Try to delete a played deck and read the FK error
begin; delete from deck where id = (select deck_id from game_player limit 1); rollback;
```

---

## Summary

- Better Auth owns `user`/`session`/`oauth_account`/`verification`; the app owns the rest. Field names are mapped to snake_case.
- `playgroup_member.user_id` and `game_player.playgroup_member_id` are nullable on purpose; always handle null.
- `game_player.deck_id` and `game.playgroup_id` don't cascade, and code is written around that.
- The sentinel user keeps shared history intact after account deletion.

## Knowledge check

**1. A `game_player` row has `playgroup_member_id = null` and `guest_name = null`. What happened?**

- A) Data corruption
- B) The player was a pod member who was later removed; the FK set the link to null
- C) The player skipped the survey
- D) The player conceded

<details><summary>Answer</summary>

**B.** Guests have a `guest_name`, deleted accounts get `'Deleted player'`, and removed members end up with both null. The recap falls back to "Guest".
</details>

**2. What prevents deleting a deck that appears in a past game?**

- A) A trigger
- B) The `game_player.deck_id` foreign key has no `ON DELETE` action, so Postgres rejects the delete
- C) The service checks it
- D) Nothing; it cascades

<details><summary>Answer</summary>

**B.** The default `NO ACTION` behaves like a restriction.
</details>

**3. Where do you look to know whether `playgroup.created_by` has a foreign key to `"user"`?**

- A) `db/schema.ts`
- B) The SQL migration that created the table
- C) Better Auth's docs
- D) Drizzle Studio's relation view

<details><summary>Answer</summary>

**B.** `schema.ts` omits FKs to `"user"` because that table isn't in it. The SQL migration (`001`) has `REFERENCES "user"(id)`.
</details>

**4. Why does a survey row not exist for some players in a saved game?**

- A) The insert failed silently
- B) The player skipped the survey (no rating and no text), and rows are only created when something was answered
- C) Guests can't answer surveys
- D) The unique constraint blocked it

<details><summary>Answer</summary>

**B.** `createGame` inserts a `survey_response` only if `surveyFun`, `surveyAgency` or `surveyTakeaway` has a value.
</details>

**5. Which statement about `decklist_card.scryfall_id` is true?**

- A) It's a Scryfall card (printing) id usable with `/cards/:id`
- B) It holds Scryfall's oracle_id, which identifies the card across printings
- C) It's Archidekt's card id
- D) It's a foreign key to a `card` table

<details><summary>Answer</summary>

**B.** Despite the column name, it's the oracle_id (Archidekt's `oracleCard.uid`). That's why the art proxy resolves it with a search query instead of `/cards/:id`.
</details>

---

**Next:** [Module 7: Migrations →](07-migrations.md)
