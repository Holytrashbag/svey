import { eq, avg, count, and, inArray } from 'drizzle-orm'
import type { Db } from '../lib/db.ts'
import {
  game,
  gamePlayer,
  playgroupMember,
  playgroup,
  deck,
  decklistCard,
  surveyResponse,
} from '../db/schema.ts'
import { Errors } from '../lib/errors.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateGamePlayer = {
  name: string
  isGuest: boolean
  memberId: string | null
  deckId: string
  finalLife: number
  poison: number
  deathCause: 'life' | 'cmdr_dmg' | 'poison' | 'conceded' | 'special' | 'none'
  deathAt: number | null
  isWinner: boolean
  surveyFun: number | null
  surveyAgency: number | null
  surveyTakeaway: string
}

export type CreateGameBody = {
  podId: string
  durationSec: number
  endReason: 'won' | 'draw' | 'abandoned'
  /** Reason ids picked when a game is retired early (endReason 'abandoned'). */
  abandonReasons?: string[]
  players: CreateGamePlayer[]
}

export type GameDetailPlayer = {
  name: string
  isGuest: boolean
  deck: { name: string; commander: string | null } | null
  finalLife: number
  isWinner: boolean
  deathCause: string
  deathAt: number | null
}

export type GameDetail = {
  id: string
  playgroup: { id: string; name: string }
  playedAt: string
  durationSec: number
  endReason: string
  players: GameDetailPlayer[]
  survey: { avgFun: number | null; avgAgency: number | null; responseCount: number } | null
}

// ── Access ────────────────────────────────────────────────────────────────────

/** Throws 403 unless `userId` is an active member of the playgroup. */
async function assertPlaygroupMember(dbClient: Db, playgroupId: string, userId: string): Promise<void> {
  const memberRows = await dbClient
    .select({ id: playgroupMember.id })
    .from(playgroupMember)
    .where(and(
      eq(playgroupMember.playgroupId, playgroupId),
      eq(playgroupMember.userId, userId),
      eq(playgroupMember.isPending, false),
    ))
    .limit(1)

  if (!memberRows.length) throw Errors.forbidden('Not a member of this playgroup')
}

// ── createGame ────────────────────────────────────────────────────────────────

export async function createGame(dbClient: Db, userId: string, body: CreateGameBody): Promise<string> {
  await assertPlaygroupMember(dbClient, body.podId, userId)

  // Every seated member must belong to the playgroup the game is logged in.
  const memberIds = [...new Set(body.players.flatMap(p => (p.isGuest || !p.memberId ? [] : [p.memberId])))]
  if (memberIds.length > 0) {
    const found = await dbClient
      .select({ id: playgroupMember.id })
      .from(playgroupMember)
      .where(and(eq(playgroupMember.playgroupId, body.podId), inArray(playgroupMember.id, memberIds)))
    if (found.length !== memberIds.length) {
      throw Errors.badRequest('All players must be members of this playgroup or guests.')
    }
  }

  let gameId = ''

  await dbClient.transaction(async (tx) => {
    const startedAt = new Date(Date.now() - body.durationSec * 1000)
    const endedAt = new Date()

    const [created] = await tx
      .insert(game)
      .values({
        playgroupId: body.podId,
        hostUserId: userId,
        status: 'completed',
        endReason: body.endReason,
        abandonReasons: body.endReason === 'abandoned' ? (body.abandonReasons ?? []) : null,
        durationSeconds: body.durationSec,
        startedAt,
        endedAt,
      })
      .returning({ id: game.id })

    if (!created) throw new Error('Failed to insert game')
    gameId = created.id

    for (let i = 0; i < body.players.length; i++) {
      const p = body.players[i]!
      const diedAt = p.deathAt != null
        ? new Date(startedAt.getTime() + p.deathAt * 1000)
        : null

      const [gp] = await tx
        .insert(gamePlayer)
        .values({
          gameId,
          playgroupMemberId: p.memberId ?? null,
          deckId: p.deckId,
          guestName: p.isGuest ? p.name : null,
          turnOrder: i,
          finalLife: p.finalLife,
          poisonCounters: p.poison,
          deathCause: p.deathCause,
          diedAt,
          isWinner: p.isWinner,
        })
        .returning({ id: gamePlayer.id })

      if (!gp) throw new Error('Failed to insert game player')

      if (p.surveyFun != null || p.surveyAgency != null || p.surveyTakeaway.length > 0) {
        await tx.insert(surveyResponse).values({
          gameId,
          gamePlayerId: gp.id,
          funRating: p.surveyFun ?? null,
          agencyRating: p.surveyAgency ?? null,
          takeaway: p.surveyTakeaway || null,
        })
      }
    }
  })

  return gameId
}

// ── getGameDetail ─────────────────────────────────────────────────────────────

export async function getGameDetail(dbClient: Db, gameId: string, userId: string): Promise<GameDetail> {
  const gameRows = await dbClient
    .select({
      gameId:        game.id,
      playgroupId:   playgroup.id,
      playgroupName: playgroup.name,
      startedAt:     game.startedAt,
      durationSec:   game.durationSeconds,
      endReason:     game.endReason,
    })
    .from(game)
    .innerJoin(playgroup, eq(playgroup.id, game.playgroupId))
    .where(eq(game.id, gameId))
    .limit(1)

  const gameRow = gameRows[0]
  if (!gameRow) throw Errors.notFound('Game not found')

  await assertPlaygroupMember(dbClient, gameRow.playgroupId, userId)

  const playerRows = await dbClient
    .select({
      gpId:        gamePlayer.id,
      memberId:    gamePlayer.playgroupMemberId,
      guestName:   gamePlayer.guestName,
      memberName:  playgroupMember.displayName,
      deckId:      gamePlayer.deckId,
      deckName:    deck.name,
      finalLife:   gamePlayer.finalLife,
      isWinner:    gamePlayer.isWinner,
      deathCause:  gamePlayer.deathCause,
      diedAt:      gamePlayer.diedAt,
      turnOrder:   gamePlayer.turnOrder,
    })
    .from(gamePlayer)
    .leftJoin(playgroupMember, eq(playgroupMember.id, gamePlayer.playgroupMemberId))
    .leftJoin(deck, eq(deck.id, gamePlayer.deckId))
    .where(eq(gamePlayer.gameId, gameId))
    .orderBy(gamePlayer.turnOrder)

  // Commander names per deck (from live decklist — good enough for recap)
  const deckIds = [...new Set(playerRows.map(p => p.deckId).filter((id): id is string => id != null))]
  const commanders: Record<string, string> = {}
  if (deckIds.length > 0) {
    const cmdRows = await dbClient
      .select({ deckId: decklistCard.deckId, cardName: decklistCard.cardName })
      .from(decklistCard)
      .where(and(eq(decklistCard.isCommander, true), inArray(decklistCard.deckId, deckIds)))
    for (const r of cmdRows) {
      commanders[r.deckId] = r.cardName
    }
  }

  const surveyRows = await dbClient
    .select({
      avgFun:    avg(surveyResponse.funRating),
      avgAgency: avg(surveyResponse.agencyRating),
      total:     count(),
    })
    .from(surveyResponse)
    .where(eq(surveyResponse.gameId, gameId))

  const surveyRow = surveyRows[0]
  const responseCount = Number(surveyRow?.total ?? 0)

  const players: GameDetailPlayer[] = playerRows.map(p => {
    const isGuest = p.memberId == null
    const name = isGuest ? (p.guestName ?? 'Guest') : (p.memberName ?? 'Unknown')
    const deathAt = p.diedAt != null
      ? Math.round((p.diedAt.getTime() - gameRow.startedAt.getTime()) / 1000)
      : null

    return {
      name,
      isGuest,
      deck: p.deckId != null
        ? { name: p.deckName ?? 'Unknown deck', commander: commanders[p.deckId] ?? null }
        : null,
      finalLife: p.finalLife,
      isWinner: p.isWinner,
      deathCause: p.deathCause ?? 'none',
      deathAt,
    }
  })

  return {
    id: gameRow.gameId,
    playgroup: { id: gameRow.playgroupId, name: gameRow.playgroupName },
    playedAt: gameRow.startedAt.toISOString(),
    durationSec: gameRow.durationSec ?? 0,
    endReason: gameRow.endReason ?? 'abandoned',
    players,
    survey: responseCount > 0
      ? {
          avgFun:    surveyRow?.avgFun    != null ? Math.round(Number(surveyRow.avgFun)    * 10) / 10 : null,
          avgAgency: surveyRow?.avgAgency != null ? Math.round(Number(surveyRow.avgAgency) * 10) / 10 : null,
          responseCount,
        }
      : null,
  }
}

// ── deleteGame ────────────────────────────────────────────────────────────────

export async function deleteGame(dbClient: Db, gameId: string, userId: string): Promise<void> {
  const gameRows = await dbClient
    .select({ playgroupId: game.playgroupId })
    .from(game)
    .where(eq(game.id, gameId))
    .limit(1)

  const gameRow = gameRows[0]
  if (!gameRow) throw Errors.notFound('Game not found')

  await assertPlaygroupMember(dbClient, gameRow.playgroupId, userId)

  await dbClient.delete(game).where(eq(game.id, gameId))
}
