import { sql, eq, and, ne, inArray, desc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Db } from '../lib/db.ts'
import { deck, game, gamePlayer, playgroupMember, surveyResponse, decklistCard } from '../db/schema.ts'
import { Errors } from '../lib/errors.ts'
import { buildPlayerStats, type PlayerStats } from '../lib/player-stats.ts'

// ── Private helpers ────────────────────────────────────────────────────────────

async function fetchMemberIds(dbClient: Db, userId: string): Promise<string[]> {
  const rows = await dbClient
    .select({ id: playgroupMember.id })
    .from(playgroupMember)
    .where(eq(playgroupMember.userId, userId))
  return rows.map(r => r.id)
}

function buildPlacementsCte(dbClient: Db) {
  return dbClient.$with('placements').as(
    dbClient
      .select({
        deckId:    gamePlayer.deckId,
        memberId:  gamePlayer.playgroupMemberId,
        endReason: game.endReason,
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

// ── Player stats ───────────────────────────────────────────────────────────────

export type { PlayerStats } from '../lib/player-stats.ts'

export async function getPlayerStats(dbClient: Db, userId: string): Promise<PlayerStats> {
  const memberIds = await fetchMemberIds(dbClient, userId)

  if (memberIds.length === 0) return buildPlayerStats([], [])

  const ids = memberIds as [string, ...string[]]
  const placementsCte = buildPlacementsCte(dbClient)

  const [results, placements] = await Promise.all([
    dbClient
      .select({
        endReason: game.endReason,
        isWinner:  gamePlayer.isWinner,
        n:         sql<number>`count(*)::int`,
      })
      .from(gamePlayer)
      .innerJoin(game, eq(game.id, gamePlayer.gameId))
      .where(and(inArray(gamePlayer.playgroupMemberId, ids), eq(game.status, 'completed')))
      .groupBy(game.endReason, gamePlayer.isWinner),
    dbClient
      .with(placementsCte)
      .select({
        endReason:    placementsCte.endReason,
        placementSum: sql<number>`sum(${placementsCte.placement})::float`,
        n:            sql<number>`count(*)::int`,
      })
      .from(placementsCte)
      .where(inArray(placementsCte.memberId, ids))
      .groupBy(placementsCte.endReason),
  ])

  return buildPlayerStats(
    results.map(r => ({ ...r, n: Number(r.n) })),
    placements.map(r => ({ ...r, placementSum: Number(r.placementSum), n: Number(r.n) })),
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type DeckMatchupStat = {
  deckId:    string
  commander: string | null
  games:     number
  winrate:   number
}

export type DeckStatScope = {
  games:               number
  wins:                number
  losses:              number
  winrate:             number
  avgPlacement:        number | null
  avgSurvivalMinutes:  number | null
  avgFunRating:        number | null
  eliminated:          number
  recentResults:       ('W' | 'L')[]
  matchups:            DeckMatchupStat[]
}

export type DeckStats = {
  mine:    DeckStatScope | null
  general: DeckStatScope | null
}

// ── buildStatScope ─────────────────────────────────────────────────────────────

async function buildStatScope(
  dbClient: Db,
  deckId: string,
  memberIds?: string[],
): Promise<DeckStatScope | null> {
  // No member IDs means the user has never joined any playgroup → no "mine" data
  if (memberIds !== undefined && memberIds.length === 0) return null

  const memberFilter = memberIds
    ? [inArray(gamePlayer.playgroupMemberId, memberIds as [string, ...string[]])]
    : []

  const coreFilter = [
    eq(gamePlayer.deckId, deckId),
    eq(game.status, 'completed'),
    ...memberFilter,
  ]

  // ── Base stats ──────────────────────────────────────────────────────────────
  const [base] = await dbClient
    .select({
      games:          sql<number>`count(*)::int`,
      wins:           sql<number>`sum(${gamePlayer.isWinner}::int)::int`,
      eliminated:     sql<number>`sum(case when ${gamePlayer.deathCause} != 'none' then 1 else 0 end)::int`,
      avgSurvivalSec: sql<number | null>`avg(
        extract(epoch from (coalesce(${gamePlayer.diedAt}, ${game.endedAt}) - ${game.startedAt}))
      )::float`,
    })
    .from(gamePlayer)
    .innerJoin(game, eq(game.id, gamePlayer.gameId))
    .where(and(...coreFilter))

  if (!base || Number(base.games) === 0) return null

  const games = Number(base.games)
  const wins  = Number(base.wins)

  // ── Avg placement via CTE + window function ─────────────────────────────────
  const placementsCte = buildPlacementsCte(dbClient)

  const placementFilter = [
    eq(placementsCte.deckId, deckId),
    ...(memberIds ? [inArray(placementsCte.memberId, memberIds as [string, ...string[]])] : []),
  ]

  const [placementRow] = await dbClient
    .with(placementsCte)
    .select({ avg: sql<number | null>`avg(${placementsCte.placement}::float)::float` })
    .from(placementsCte)
    .where(and(...placementFilter))

  // ── Fun rating ─────────────────────────────────────────────────────────────
  const funFilter = [
    eq(gamePlayer.deckId, deckId),
    eq(game.status, 'completed'),
    ...memberFilter,
  ]

  const [funRow] = await dbClient
    .select({ avg: sql<number | null>`avg(${surveyResponse.funRating})::float` })
    .from(surveyResponse)
    .innerJoin(gamePlayer, eq(gamePlayer.id, surveyResponse.gamePlayerId))
    .innerJoin(game, eq(game.id, surveyResponse.gameId))
    .where(and(...funFilter))

  // ── Recent 12 results ──────────────────────────────────────────────────────
  const recentRows = await dbClient
    .select({ isWinner: gamePlayer.isWinner })
    .from(gamePlayer)
    .innerJoin(game, eq(game.id, gamePlayer.gameId))
    .where(and(...coreFilter))
    .orderBy(desc(game.startedAt))
    .limit(12)

  // ── Matchups ───────────────────────────────────────────────────────────────
  const myGamesCte = dbClient.$with('my_games').as(
    dbClient
      .select({
        gameId:   gamePlayer.gameId,
        isWinner: gamePlayer.isWinner,
      })
      .from(gamePlayer)
      .innerJoin(game, eq(game.id, gamePlayer.gameId))
      .where(and(...coreFilter)),
  )

  const opp = alias(gamePlayer, 'opp')

  const matchupRows = await dbClient
    .with(myGamesCte)
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

  // Fetch commander names for opponent decks
  const oppDeckIds = matchupRows.map(r => r.oppDeckId)
  const commanderRows = oppDeckIds.length > 0
    ? await dbClient
        .select({ deckId: decklistCard.deckId, name: decklistCard.cardName })
        .from(decklistCard)
        .where(and(
          inArray(decklistCard.deckId, oppDeckIds),
          eq(decklistCard.isCommander, true),
        ))
    : []

  const commanderMap = new Map(commanderRows.map(c => [c.deckId, c.name]))

  const matchups: DeckMatchupStat[] = matchupRows.map(r => {
    const g = Number(r.games)
    const w = Number(r.wins)
    return {
      deckId:    r.oppDeckId,
      commander: commanderMap.get(r.oppDeckId) ?? null,
      games:     g,
      winrate:   g > 0 ? Math.round((w / g) * 100) : 50,
    }
  })

  return {
    games,
    wins,
    losses:             games - wins,
    winrate:            Math.round((wins / games) * 100),
    avgPlacement:       placementRow?.avg != null ? Number(placementRow.avg) : null,
    avgSurvivalMinutes: base.avgSurvivalSec != null ? Number(base.avgSurvivalSec) / 60 : null,
    avgFunRating:       funRow?.avg != null ? Number(funRow.avg) : null,
    eliminated:         Number(base.eliminated),
    recentResults:      recentRows.map(r => (r.isWinner ? 'W' : 'L')),
    matchups,
  }
}

// ── getPlayerDeckStats ─────────────────────────────────────────────────────────

export type PlayerDeckStat = {
  deckId:       string
  deckName:     string
  commander:    string | null
  isOwner:      boolean
  games:        number
  wins:         number
  losses:       number
  winrate:      number
  avgPlacement: number | null
}

export async function getPlayerDeckStats(
  dbClient: Db,
  userId: string,
): Promise<PlayerDeckStat[]> {
  const memberIds = await fetchMemberIds(dbClient, userId)
  if (memberIds.length === 0) return []

  // Aggregate games/wins per deck for this player
  const baseRows = await dbClient
    .select({
      deckId: gamePlayer.deckId,
      games:  sql<number>`count(*)::int`,
      wins:   sql<number>`sum(${gamePlayer.isWinner}::int)::int`,
    })
    .from(gamePlayer)
    .innerJoin(game, eq(game.id, gamePlayer.gameId))
    .where(and(
      inArray(gamePlayer.playgroupMemberId, memberIds as [string, ...string[]]),
      eq(game.status, 'completed'),
    ))
    .groupBy(gamePlayer.deckId)

  if (baseRows.length === 0) return []

  const deckIds = baseRows.map(r => r.deckId)

  // Avg placement per deck via CTE + window function
  const placementsCte = buildPlacementsCte(dbClient)

  const placementRows = await dbClient
    .with(placementsCte)
    .select({
      deckId: placementsCte.deckId,
      avg:    sql<number | null>`avg(${placementsCte.placement}::float)::float`,
    })
    .from(placementsCte)
    .where(and(
      inArray(placementsCte.deckId, deckIds),
      inArray(placementsCte.memberId, memberIds as [string, ...string[]]),
    ))
    .groupBy(placementsCte.deckId)

  const placementMap = new Map(placementRows.map(r => [r.deckId, r.avg]))

  // Deck metadata + commander names in parallel
  const [deckRows, commanderRows] = await Promise.all([
    dbClient
      .select({ id: deck.id, name: deck.name, ownerUserId: deck.ownerUserId })
      .from(deck)
      .where(inArray(deck.id, deckIds)),
    dbClient
      .select({ deckId: decklistCard.deckId, cardName: decklistCard.cardName })
      .from(decklistCard)
      .where(and(
        inArray(decklistCard.deckId, deckIds),
        eq(decklistCard.isCommander, true),
      )),
  ])

  const deckMap = new Map(deckRows.map(d => [d.id, d]))
  const commanderMap = new Map(commanderRows.map(c => [c.deckId, c.cardName]))

  return baseRows
    .map(r => {
      const d = deckMap.get(r.deckId)
      const g = Number(r.games)
      const w = Number(r.wins)
      const avg = placementMap.get(r.deckId) ?? null
      return {
        deckId:       r.deckId,
        deckName:     d?.name ?? 'Unknown Deck',
        commander:    commanderMap.get(r.deckId) ?? null,
        isOwner:      d?.ownerUserId === userId,
        games:        g,
        wins:         w,
        losses:       g - w,
        winrate:      g > 0 ? Math.round((w / g) * 100) : 0,
        avgPlacement: avg != null ? Number(avg) : null,
      }
    })
    .sort((a, b) => b.games - a.games)
}

// ── getDeckStats ───────────────────────────────────────────────────────────────

export async function getDeckStats(
  dbClient: Db,
  userId: string,
  deckId: string,
): Promise<DeckStats> {
  const [deckRow] = await dbClient
    .select({ ownerUserId: deck.ownerUserId })
    .from(deck)
    .where(eq(deck.id, deckId))
    .limit(1)

  if (!deckRow) throw Errors.notFound('Deck not found')
  if (deckRow.ownerUserId !== userId) throw Errors.forbidden('You do not own this deck')

  const memberIds = await fetchMemberIds(dbClient, userId)

  const [mine, general] = await Promise.all([
    buildStatScope(dbClient, deckId, memberIds),
    buildStatScope(dbClient, deckId),
  ])

  return { mine, general }
}
