# Module 10: Stats and aggregations

**Duration:** 50 min · **Level:** Advanced · **Prerequisites:** [Module 5](05-services-and-authorization.md), [Module 6](06-database-schema.md); SQL `GROUP BY` and window functions

Stats are why people log games. They are also the easiest place to ship a subtle bug, because a wrong number still *looks* like a number. This module explains how each statistic is computed, the pattern that keeps the rules testable, and the inconsistencies you need to know about.

## Learning objectives

After this module you can:

- Compute a member's pod win rate and threat by hand and explain which games count.
- Apply the "aggregate in SQL, decide in TypeScript" pattern.
- Read the placement window function and the deck-matchup query.
- Explain the `mine` vs `general` scopes of deck stats and who can see them.
- Name the current inconsistencies between pod standings and deck/profile stats.

---

## Unit 1: Where stats are computed

| Screen | Endpoint | Code |
|---|---|---|
| Pod detail: standings, totals, threat, main deck, recent games | `GET /api/playgroups/:id` | `getPlaygroupDetail` in [`playgroup.service.ts`](../../apps/api/services/playgroup.service.ts) + [`lib/pod-stats.ts`](../../apps/api/lib/pod-stats.ts) |
| Home / pods list: your W–L per pod | `GET /api/playgroups` | `listPlaygroups` |
| Profile: total games, wins, win rate, avg placement | `GET /api/users/me/stats` | `getPlayerStats` in [`stats.service.ts`](../../apps/api/services/stats.service.ts) |
| Profile: per-deck table | `GET /api/users/me/deck-stats` | `getPlayerDeckStats` |
| Deck detail: mine vs general, matchups, recent results | `GET /api/decks/:id/stats` | `getDeckStats` → `buildStatScope` |

On the frontend, [`lib/pod-standings.ts`](../../apps/frontend/src/lib/pod-standings.ts) orders standings and [`usePlaygroupStats`](../../apps/frontend/src/composables/usePlaygroupStats.ts) derives "my" wins, win rate, threat and streak.

---

## Unit 2: Pod standings, the rules

These rules were settled in issue #39 and are encoded in `lib/pod-stats.ts`:

```ts
/** Games that count toward stats. Retired (`abandoned`) and unfinished (null) games don't. */
export function isFinishedGame(endReason: GameEndReason | null): boolean {
  return endReason === 'won' || endReason === 'draw'
}

export function tallyMemberRecords(rows: readonly MemberResultRow[]): Map<string, MemberRecord> {
  const records = new Map<string, MemberRecord>()
  for (const r of rows) {
    if (!r.playgroupMemberId || !isFinishedGame(r.endReason)) continue
    const rec = records.get(r.playgroupMemberId) ?? { wins: 0, gamesPlayed: 0 }
    rec.gamesPlayed += r.n
    if (r.isWinner && r.endReason === 'won') rec.wins += r.n
    records.set(r.playgroupMemberId, rec)
  }
  return records
}

export function winRate(wins: number, gamesPlayed: number): number | null {
  return gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : null
}

export function threatRating(wins: number, gamesPlayed: number): number {
  return gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) / 10 : 0
}
```

| Rule | Consequence |
|---|---|
| Only **finished** games (`won`, `draw`) count | Retiring a game doesn't hurt anyone's record |
| Denominator = games **the member played** | A late joiner with 3 wins in 4 games has 75%, not 3 out of the pod's 10 |
| A win needs `endReason = 'won'` **and** `is_winner` | A draw counts as played, never as a win |
| `winRate` is `null` without games | The UI shows "—"; such members sort last |
| Guests and removed members are skipped | `playgroupMemberId` is null for them |
| `threat` = win ratio × 10, one decimal | 3/4 → 7.5 |

Pod totals use the same filter via `summarizePodGames`: `totalGames` and `thisMonth` count finished games; `avgLength` is the mean duration in whole minutes over finished games **with a recorded duration** (`duration_seconds > 0`).

### The pattern: aggregate in SQL, decide in TypeScript

The SQL groups without filtering:

```ts
dbClient
  .select({
    playgroupMemberId: gamePlayer.playgroupMemberId,
    endReason:         game.endReason,
    isWinner:          gamePlayer.isWinner,
    n:                 sql<number>`count(*)::int`,
  })
  .from(gamePlayer)
  .innerJoin(game, eq(game.id, gamePlayer.gameId))
  .where(and(inArray(gamePlayer.playgroupMemberId, memberIds), eq(game.playgroupId, playgroupId)))
  .groupBy(gamePlayer.playgroupMemberId, game.endReason, gamePlayer.isWinner)
```

…and the pure function decides what counts. Why split it this way?

- The rule ("what is a finished game?", "what is a win?") lives in one function that's **unit-tested without a database** ([`pod-stats.test.ts`](../../apps/api/lib/pod-stats.test.ts)).
- The SQL stays a dumb, cheap `GROUP BY` that returns a few rows per member.
- Changing the rule is a one-line, fully-tested change.

**Use this pattern for new stats.** It's the house answer to "we have no database in tests".

### Standings order (frontend)

```ts
export function sortStandings<T extends StandingFields>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => {
    if (a.winRate !== b.winRate) {
      if (a.winRate === null) return 1
      if (b.winRate === null) return -1
      return b.winRate - a.winRate
    }
    return b.wins - a.wins || b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name)
  })
}
```

Win rate desc (no-games last) → wins → games played → name.

**Streak** ([`usePlaygroupStats`](../../apps/frontend/src/composables/usePlaygroupStats.ts)): walk `recent` (newest first, up to 8 games with a winner) and count while `winnerId === me.id`.

**Main deck**: the deck a member has played most in this pod.

---

## Unit 3: Placement, a window function

Average placement is computed with a CTE ([`stats.service.ts`](../../apps/api/services/stats.service.ts)):

```ts
function buildPlacementsCte(dbClient: Db) {
  return dbClient.$with('placements').as(
    dbClient
      .select({
        deckId:    gamePlayer.deckId,
        memberId:  gamePlayer.playgroupMemberId,
        placement: sql<number>`rank() over (
          partition by ${gamePlayer.gameId}
          order by
            case when ${gamePlayer.isWinner} then 0 else 1 end asc,
            ${gamePlayer.diedAt} desc nulls last
        )`.as('placement'),
      })
      .from(gamePlayer)
      .innerJoin(game, eq(game.id, gamePlayer.gameId))
      .where(eq(game.status, 'completed')),
  )
}
```

Read it as: *within each game*, the winner is 1st; everyone else is ordered by **when they died, latest first** (surviving longer = better place). `rank()` gives ties the same number.

Example, a 4-player won game:

| Player | is_winner | died_at | placement |
|---|---|---|---|
| Ana | ✓ | null | 1 |
| Ben | | 01:20:00 | 2 |
| Cleo | | 00:55:00 | 3 |
| Dev | | 00:30:00 | 4 |

---

## Unit 4: Deck stats, `mine` vs `general`

`GET /api/decks/:id/stats` is **owner-only** (403 otherwise) and returns two scopes from `buildStatScope`:

| Scope | Filter | Meaning |
|---|---|---|
| `mine` | `game_player.playgroup_member_id IN (my membership ids)` | Games where **you** piloted this deck, across all your pods |
| `general` | none | Every game this deck was in, whoever piloted it (borrowed plays included) |

Each scope contains games, wins, losses, win rate, average placement, average survival minutes, average fun rating, times eliminated, the last 12 results (`W`/`L`), and up to 10 **matchups**:

```ts
const opp = alias(gamePlayer, 'opp')                 // self-join game_player as "opponent"

dbClient
  .with(myGamesCte)                                  // games this deck played (in scope)
  .select({
    oppDeckId: opp.deckId,
    games:     sql<number>`count(*)::int`,
    wins:      sql<number>`sum(${myGamesCte.isWinner}::int)::int`,
  })
  .from(myGamesCte)
  .innerJoin(opp, and(eq(opp.gameId, myGamesCte.gameId), ne(opp.deckId, deckId)))
  .groupBy(opp.deckId)
  .orderBy(sql`sum(${myGamesCte.isWinner}::int)::float / nullif(count(*), 0) desc nulls last`)
  .limit(10)
```

`alias()` is how Drizzle self-joins a table. `nullif(count(*), 0)` avoids division by zero.

**Visibility recap:** pod stats are visible to every pod member; deck stats are private to the deck owner, even for games in pods the owner shares with others.

---

## Unit 5: Sharp edges

As of this writing, these are real behaviours of the code. Read them before you change stats, and consider filing issues rather than fixing silently.

| # | Behaviour | Where | Effect |
|---|---|---|---|
| 1 | `stats.service.ts` filters on `game.status = 'completed'`. **Every** saved game has that status, retired ones included | `getPlayerStats`, `buildStatScope`, `getPlayerDeckStats`, placements CTE | Profile and deck stats count retired games (as losses); pod standings don't |
| 2 | In a retired game nobody is winner, so survivors (`died_at` null) rank **after** eliminated players (`desc nulls last`) | placements CTE | Surviving a retired game worsens average placement |
| 3 | `listPlaygroups` counts wins/losses over all of a member's games, with no end-reason filter | `listPlaygroups` | The W–L on the pods list can disagree with the pod standings |
| 4 | `listDecks` returns `wins: 0, losses: 0` placeholders | `deck.service.listDecks` | Don't trust those fields; use deck stats |
| 5 | `deck_stat_view` / `player_stat_view` exist in SQL but nothing reads them | migration `001` | Don't build on them without reconciling the rules |

The robust fix for 1–3 is to reuse `isFinishedGame` semantics (`end_reason IN ('won','draw')`) everywhere, with tests in the style of `pod-stats.test.ts`.

---

## Try it

1. With the demo seed, open a pod and pick a member. Compute their win rate by hand:

   ```sql
   select g.end_reason, gp.is_winner, count(*)
   from game_player gp join game g on g.id = gp.game_id
   join playgroup_member pm on pm.id = gp.playgroup_member_id
   where pm.display_name = '<name>' and g.playgroup_id = '<pod id>'
   group by 1, 2;
   ```

   Apply the rules from Unit 2 and compare with the UI.
2. Run the placement ranking by hand for the seed's retired game:

   ```sql
   select gp.game_id, coalesce(pm.display_name, gp.guest_name) as player, gp.is_winner, gp.died_at,
          rank() over (partition by gp.game_id
                       order by case when gp.is_winner then 0 else 1 end, gp.died_at desc nulls last) as placement
   from game_player gp
   join game g on g.id = gp.game_id
   left join playgroup_member pm on pm.id = gp.playgroup_member_id
   where g.end_reason = 'abandoned'
   order by gp.game_id, placement;
   ```

   In the seed nobody died before the retire, so everyone ties at 1. Predict what changes if one player had been eliminated first, and check your answer against sharp edge #2.

---

## Summary

- Pod standings: only `won`/`draw` games count, the denominator is games played, and the rule lives in pure, tested functions.
- Placement = `rank()` per game: winner first, then latest death.
- Deck stats are owner-only, with a `mine` (you piloted) and a `general` (anyone piloted) scope.
- Profile/deck stats and the pods-list record currently use looser filters than pod standings.

## Knowledge check

**1. Ana joined a pod after 6 games. She played the next 4 and won 3. One more game was retired while she was seated. What is her pod win rate?**

- A) 30%
- B) 60%
- C) 75%
- D) 27%

<details><summary>Answer</summary>

**C.** The retired game doesn't count; 3 wins / 4 finished games played = 75%.
</details>

**2. What's Ana's threat rating?**

- A) 3
- B) 7.5
- C) 75
- D) 0.75

<details><summary>Answer</summary>

**B.** `round(0.75 × 100) / 10 = 7.5`.
</details>

**3. Why does `getPlaygroupDetail` group by `endReason` and `isWinner` instead of filtering in SQL?**

- A) Postgres can't filter enums
- B) So the counting rules live in a pure, unit-tested function (`tallyMemberRecords`) and the SQL stays a simple aggregation
- C) For performance
- D) Drizzle doesn't support `WHERE` with joins

<details><summary>Answer</summary>

**B.** It's the "aggregate in SQL, decide in TypeScript" pattern that compensates for having no DB in tests.
</details>

**4. In a won game, Ben died at minute 80 and Cleo at minute 55. Who has the better placement?**

- A) Cleo, because she died first
- B) Ben, because `died_at desc` ranks later deaths higher
- C) They tie
- D) Neither; only winners get a placement

<details><summary>Answer</summary>

**B.** Winner = 1, then ordered by death time, latest first.
</details>

**5. Jordan borrows your deck and plays it in a pod you're both in. Where does that game appear in your deck's stats?**

- A) In `mine` and `general`
- B) Only in `general`, because `mine` is filtered to your memberships as pilot
- C) Only in `mine`
- D) Nowhere; borrowed games are excluded

<details><summary>Answer</summary>

**B.** `mine` requires one of your membership ids on the seat.
</details>

---

**Next:** [Module 11: Frontend architecture →](11-frontend-architecture.md)
