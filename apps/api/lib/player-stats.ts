import type { GameEndReason } from './pod-stats.ts'

// Pure player-stats rules, kept free of DB calls so they can be unit-tested.

export type PlayerStats = {
  totalGames:   number
  totalWins:    number
  winRate:      number | null
  avgPlacement: number | null
}

export type PlayerResultRow    = { endReason: GameEndReason | null; isWinner: boolean; n: number }
export type PlayerPlacementRow = { endReason: GameEndReason | null; placementSum: number; n: number }

export function buildPlayerStats(
  _results: readonly PlayerResultRow[],
  _placements: readonly PlayerPlacementRow[],
): PlayerStats {
  throw new Error('not implemented')
}
