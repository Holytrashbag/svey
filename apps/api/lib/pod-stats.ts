import type { gameEndReasonEnum } from '../db/schema.ts'

// Pure pod-stats rules, kept free of DB calls so they can be unit-tested.
// The service aggregates rows with GROUP BY; these functions decide what counts.

export type GameEndReason = (typeof gameEndReasonEnum.enumValues)[number]

/** Games that count toward stats. Retired (`abandoned`) and unfinished (null) games don't. */
export function isFinishedGame(endReason: GameEndReason | null): boolean {
  return endReason === 'won' || endReason === 'draw'
}

export type MemberResultRow = {
  playgroupMemberId: string | null
  endReason:         GameEndReason | null
  isWinner:          boolean
  n:                 number
}

export type MemberRecord = { wins: number; gamesPlayed: number }

/**
 * Folds per-member (endReason, isWinner) counts into wins and games played.
 * Only finished games count; a win needs `endReason === 'won'`. Guests and
 * removed members (null member id) are skipped.
 */
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

/** Integer win percentage, or null when the member hasn't played a finished game. */
export function winRate(wins: number, gamesPlayed: number): number | null {
  return gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : null
}

/** Threat on a 0–10 scale with one decimal, from the same ratio as the win rate. */
export function threatRating(wins: number, gamesPlayed: number): number {
  return gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) / 10 : 0
}

export type PodGameAggRow = {
  endReason:    GameEndReason | null
  games:        number
  thisMonth:    number
  timedGames:   number
  timedSeconds: number
}

export type PodGameSummary = { totalGames: number; thisMonth: number; avgLength: number }

/** Sums per-endReason pod aggregates over finished games; avgLength is in whole minutes. */
export function summarizePodGames(rows: readonly PodGameAggRow[]): PodGameSummary {
  let totalGames = 0
  let thisMonth = 0
  let timedGames = 0
  let timedSeconds = 0
  for (const r of rows) {
    if (!isFinishedGame(r.endReason)) continue
    totalGames   += r.games
    thisMonth    += r.thisMonth
    timedGames   += r.timedGames
    timedSeconds += r.timedSeconds
  }
  const avgLength = timedGames > 0 ? Math.round(timedSeconds / timedGames / 60) : 0
  return { totalGames, thisMonth, avgLength }
}
