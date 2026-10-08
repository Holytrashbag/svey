import { test } from 'node:test'
import assert from 'node:assert'
import { tallyDeckRecords, type DeckResultRow } from './deck-stats.ts'

const A = 'deck-a'
const B = 'deck-b'

function row(
  deckId: string,
  endReason: DeckResultRow['endReason'],
  isWinner: boolean,
  n: number,
): DeckResultRow {
  return { deckId, endReason, isWinner, n }
}

test('tallyDeckRecords counts wins, losses and a draw and ignores an abandoned game', () => {
  const records = tallyDeckRecords([
    row(A, 'won', true, 2),
    row(A, 'won', false, 1),
    row(A, 'draw', false, 1),
    row(A, 'abandoned', false, 1),
  ])
  assert.deepStrictEqual(records.get(A), { wins: 2, losses: 2 })
})

test('abandoned games count toward neither wins nor losses, even with a winner flag', () => {
  const records = tallyDeckRecords([row(A, 'abandoned', true, 3)])
  assert.strictEqual(records.get(A), undefined)
})

test('a drawn game is a loss, never a win, even if isWinner is set', () => {
  const records = tallyDeckRecords([row(A, 'draw', true, 1)])
  assert.deepStrictEqual(records.get(A), { wins: 0, losses: 1 })
})

test('games with no end reason are not counted', () => {
  assert.strictEqual(tallyDeckRecords([row(A, null, true, 1)]).size, 0)
})

test('rows are tallied per deck', () => {
  const records = tallyDeckRecords([row(A, 'won', true, 1), row(B, 'won', false, 4)])
  assert.deepStrictEqual(records.get(A), { wins: 1, losses: 0 })
  assert.deepStrictEqual(records.get(B), { wins: 0, losses: 4 })
})

test('a deck with only abandoned games gets no record', () => {
  const records = tallyDeckRecords([row(A, 'abandoned', false, 2), row(B, 'won', true, 1)])
  assert.strictEqual(records.has(A), false)
})

test('rows from different pilots of one deck are summed', () => {
  const records = tallyDeckRecords([row(A, 'won', true, 1), row(A, 'won', true, 2)])
  assert.deepStrictEqual(records.get(A), { wins: 3, losses: 0 })
})
