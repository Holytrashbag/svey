import { test } from 'node:test'
import assert from 'node:assert'
import {
  isFinishedGame,
  tallyMemberRecords,
  winRate,
  threatRating,
  summarizePodGames,
  type MemberResultRow,
  type PodGameAggRow,
} from './pod-stats.ts'

const A = 'member-a'
const B = 'member-b'

function row(
  playgroupMemberId: string | null,
  endReason: MemberResultRow['endReason'],
  isWinner: boolean,
  n: number,
): MemberResultRow {
  return { playgroupMemberId, endReason, isWinner, n }
}

function podRow(endReason: PodGameAggRow['endReason'], over: Partial<PodGameAggRow> = {}): PodGameAggRow {
  return { endReason, games: 0, thisMonth: 0, timedGames: 0, timedSeconds: 0, ...over }
}

// ── isFinishedGame ────────────────────────────────────────────────────────────

test('only won and drawn games are finished', () => {
  assert.strictEqual(isFinishedGame('won'), true)
  assert.strictEqual(isFinishedGame('draw'), true)
  assert.strictEqual(isFinishedGame('abandoned'), false)
  assert.strictEqual(isFinishedGame(null), false)
})

// ── tallyMemberRecords ────────────────────────────────────────────────────────

test('tallyMemberRecords counts wins and games played per member', () => {
  const records = tallyMemberRecords([
    row(A, 'won', true, 3),
    row(A, 'won', false, 1),
    row(B, 'won', false, 3),
    row(B, 'won', true, 1),
  ])
  assert.deepStrictEqual(records.get(A), { wins: 3, gamesPlayed: 4 })
  assert.deepStrictEqual(records.get(B), { wins: 1, gamesPlayed: 4 })
})

test('abandoned games count toward neither wins nor games played', () => {
  const records = tallyMemberRecords([
    row(A, 'won', true, 3),
    row(A, 'won', false, 1),
    row(A, 'abandoned', false, 2),
    row(A, 'abandoned', true, 1),
  ])
  assert.deepStrictEqual(records.get(A), { wins: 3, gamesPlayed: 4 })
})

test('drawn games count as played but never as a win', () => {
  const records = tallyMemberRecords([
    row(A, 'won', true, 1),
    row(A, 'draw', false, 1),
    row(A, 'draw', true, 1),
  ])
  assert.deepStrictEqual(records.get(A), { wins: 1, gamesPlayed: 3 })
})

test('rows without a member id (guests, removed members) are ignored', () => {
  const records = tallyMemberRecords([
    row(null, 'won', true, 5),
    row(A, 'won', false, 2),
  ])
  assert.strictEqual(records.size, 1)
  assert.deepStrictEqual(records.get(A), { wins: 0, gamesPlayed: 2 })
})

test('games with no end reason are not counted', () => {
  const records = tallyMemberRecords([
    row(A, null, true, 2),
    row(A, 'won', true, 1),
  ])
  assert.deepStrictEqual(records.get(A), { wins: 1, gamesPlayed: 1 })
})

test('a member with only abandoned games gets no record', () => {
  const records = tallyMemberRecords([
    row(A, 'abandoned', true, 1),
    row(A, 'abandoned', false, 4),
  ])
  assert.strictEqual(records.has(A), false)
})

// ── winRate / threatRating ────────────────────────────────────────────────────

test('winRate is wins over games played: 3 of 4 is 75', () => {
  assert.strictEqual(winRate(3, 4), 75)
  assert.strictEqual(winRate(2, 3), 67)
  assert.strictEqual(winRate(0, 5), 0)
  assert.strictEqual(winRate(4, 4), 100)
})

test('winRate is null when no games were played', () => {
  assert.strictEqual(winRate(0, 0), null)
})

test('threatRating uses games played: 3 of 4 is 7.5, 0 games is 0', () => {
  assert.strictEqual(threatRating(3, 4), 7.5)
  assert.strictEqual(threatRating(4, 10), 4)
  assert.strictEqual(threatRating(0, 0), 0)
})

// ── summarizePodGames ─────────────────────────────────────────────────────────

test('summarizePodGames totals finished games beyond 50', () => {
  const summary = summarizePodGames([
    podRow('won', { games: 70, thisMonth: 6 }),
    podRow('draw', { games: 3, thisMonth: 1 }),
    podRow('abandoned', { games: 5, thisMonth: 2 }),
    podRow(null, { games: 1, thisMonth: 1 }),
  ])
  assert.strictEqual(summary.totalGames, 73)
  assert.strictEqual(summary.thisMonth, 7)
})

test('summarizePodGames averages only finished, timed games', () => {
  const summary = summarizePodGames([
    // 60 timed won games averaging 90 min
    podRow('won', { games: 70, timedGames: 60, timedSeconds: 60 * 90 * 60 }),
    // 2 timed draws averaging 30 min → (5400*60 + 1800*2) / 62 s ≈ 88.06 min
    podRow('draw', { games: 2, timedGames: 2, timedSeconds: 2 * 30 * 60 }),
    // abandoned games are long and must not drag the average up
    podRow('abandoned', { games: 4, timedGames: 4, timedSeconds: 4 * 600 * 60 }),
  ])
  assert.strictEqual(summary.avgLength, 88)
})

test('summarizePodGames returns zeros for a pod without finished games', () => {
  assert.deepStrictEqual(summarizePodGames([]), { totalGames: 0, thisMonth: 0, avgLength: 0 })
  assert.deepStrictEqual(
    summarizePodGames([podRow('abandoned', { games: 3, thisMonth: 3, timedGames: 3, timedSeconds: 3600 })]),
    { totalGames: 0, thisMonth: 0, avgLength: 0 },
  )
})
