import { isFinishedGame, winRate, type GameEndReason } from './pod-stats.ts'

// Pure player-stats rules, kept free of DB calls so they can be unit-tested.
// The service aggregates rows with GROUP BY; buildPlayerStats decides what counts.

export type PlayerStats = {
  /** Finished games (won | draw) across all pods. */
  totalGames:   number
  /** Wins in games that ended with a winner (`endReason === 'won'`). */
  totalWins:    number
  /** Integer percentage, or null when there is no finished game. */
  winRate:      number | null
  avgPlacement: number | null
}

export type PlayerResultRow    = { endReason: GameEndReason | null; isWinner: boolean; n: number }
export type PlayerPlacementRow = { endReason: GameEndReason | null; placementSum: number; n: number }

/** Retired and unfinished games are skipped, like in the pod and deck stats. */
export function buildPlayerStats(
  results: readonly PlayerResultRow[],
  placements: readonly PlayerPlacementRow[],
): PlayerStats {
  let totalGames = 0
  let totalWins = 0
  for (const r of results) {
    if (!isFinishedGame(r.endReason)) continue
    totalGames += r.n
    if (r.isWinner && r.endReason === 'won') totalWins += r.n
  }

  let placementSum = 0
  let placed = 0
  for (const p of placements) {
    if (!isFinishedGame(p.endReason)) continue
    placementSum += p.placementSum
    placed += p.n
  }

  return {
    totalGames,
    totalWins,
    winRate:      winRate(totalWins, totalGames),
    avgPlacement: placed > 0 ? placementSum / placed : null,
  }
}
