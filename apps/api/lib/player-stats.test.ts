import { test } from 'node:test'
import assert from 'node:assert'
import { buildPlayerStats, type PlayerResultRow, type PlayerPlacementRow } from './player-stats.ts'

function res(endReason: PlayerResultRow['endReason'], isWinner: boolean, n: number): PlayerResultRow {
  return { endReason, isWinner, n }
}

function place(endReason: PlayerPlacementRow['endReason'], placementSum: number, n: number): PlayerPlacementRow {
  return { endReason, placementSum, n }
}

test('sums wins and finished games across all pod memberships (2 of 10 -> 20%)', () => {
  // The service groups across every membership, so two pods show up as repeated rows.
  const stats = buildPlayerStats(
    [res('won', true, 1), res('won', false, 4), res('won', true, 1), res('won', false, 4)],
    [],
  )
  assert.equal(stats.totalGames, 10)
  assert.equal(stats.totalWins, 2)
  assert.equal(stats.winRate, 20)
})

test('ignores retired games, even one flagged as a win', () => {
  const stats = buildPlayerStats([res('abandoned', true, 3), res('abandoned', false, 2)], [])
  assert.deepEqual(stats, { totalGames: 0, totalWins: 0, winRate: null, avgPlacement: null })
})

test('mixed reasons: only the won rows count', () => {
  const stats = buildPlayerStats(
    [res('won', true, 2), res('abandoned', true, 3), res('won', false, 8), res('abandoned', false, 4)],
    [],
  )
  assert.equal(stats.totalGames, 10)
  assert.equal(stats.totalWins, 2)
  assert.equal(stats.winRate, 20)
})

test('ignores unfinished games (null endReason)', () => {
  const stats = buildPlayerStats([res(null, true, 5), res('won', true, 1), res('won', false, 1)], [])
  assert.equal(stats.totalGames, 2)
  assert.equal(stats.winRate, 50)
})

test('counts a draw as a game played but not a win, even with a winner flag', () => {
  const stats = buildPlayerStats([res('draw', true, 1), res('won', true, 1)], [])
  assert.equal(stats.totalGames, 2)
  assert.equal(stats.totalWins, 1)
  assert.equal(stats.winRate, 50)
})

test('returns zero totals and null winRate/avgPlacement without finished games', () => {
  assert.deepEqual(buildPlayerStats([], []), { totalGames: 0, totalWins: 0, winRate: null, avgPlacement: null })
})

test('averages placement over finished games only', () => {
  const stats = buildPlayerStats(
    [res('won', true, 2)],
    [place('won', 3, 2), place('draw', 3, 1), place('abandoned', 40, 4), place(null, 9, 1)],
  )
  assert.equal(stats.avgPlacement, 2)
})
