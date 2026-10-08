import { isFinishedGame, type GameEndReason } from './pod-stats.ts'

// Pure deck-record rules, kept free of DB calls so they can be unit-tested.
// The service aggregates rows with GROUP BY; this decides what counts.

export type DeckResultRow = {
  deckId:    string
  endReason: GameEndReason | null
  isWinner:  boolean
  n:         number
}

export type DeckRecord = { wins: number; losses: number }

/**
 * Folds per-deck (endReason, isWinner) counts into a W/L record. Counts every
 * pilot of the deck (owner, borrower, guest). Only finished games count; a win
 * needs `endReason === 'won'`. A draw is a finished game without a win, so it is
 * a loss (same as `losses = games - wins` in the deck detail "general" scope).
 */
export function tallyDeckRecords(rows: readonly DeckResultRow[]): Map<string, DeckRecord> {
  const records = new Map<string, DeckRecord>()
  for (const r of rows) {
    if (!isFinishedGame(r.endReason)) continue
    const rec = records.get(r.deckId) ?? { wins: 0, losses: 0 }
    if (r.isWinner && r.endReason === 'won') rec.wins += r.n
    else rec.losses += r.n
    records.set(r.deckId, rec)
  }
  return records
}
