import { test } from 'node:test'
import assert from 'node:assert'
import {
  abandonNotesToStore,
  buildRecapPlayers,
  parseAbandonReasons,
  retireDetails,
  toNote,
  type RecapPlayerRow,
} from './game-recap.ts'

const startedAt = new Date('2026-10-01T19:00:00.000Z')

function row(over: Partial<RecapPlayerRow> = {}): RecapPlayerRow {
  return {
    memberId: 'm-alex',
    guestName: null,
    memberName: 'Alex',
    deckId: 'd-atraxa',
    deckName: 'Atraxa Superfriends',
    finalLife: 12,
    isWinner: false,
    deathCause: 'life',
    diedAt: new Date(startedAt.getTime() + 600_000),
    takeaway: null,
    ...over,
  }
}

// ── toNote ────────────────────────────────────────────────────────────────────

test('toNote returns null for null, empty and whitespace-only text', () => {
  assert.strictEqual(toNote(null), null)
  assert.strictEqual(toNote(undefined), null)
  assert.strictEqual(toNote(''), null)
  assert.strictEqual(toNote('  \n\t '), null)
})

test('toNote trims surrounding whitespace but keeps inner line breaks', () => {
  assert.strictEqual(toNote('  Atraxa did\nAtraxa things.  \n'), 'Atraxa did\nAtraxa things.')
})

// ── buildRecapPlayers ─────────────────────────────────────────────────────────

test("buildRecapPlayers puts each player's takeaway on their row as note", () => {
  const players = buildRecapPlayers(
    [
      row({ takeaway: ' Atraxa did Atraxa things. ' }),
      row({ memberId: 'm-jordan', memberName: 'Jordan', deckId: 'd-yuriko', deckName: 'Yuriko', isWinner: true, deathCause: 'none', diedAt: null }),
    ],
    { 'd-atraxa': 'Atraxa, Praetors\' Voice' },
    startedAt,
  )

  assert.deepStrictEqual(players, [
    {
      name: 'Alex',
      isGuest: false,
      deck: { name: 'Atraxa Superfriends', commander: 'Atraxa, Praetors\' Voice' },
      finalLife: 12,
      isWinner: false,
      deathCause: 'life',
      deathAt: 600,
      note: 'Atraxa did Atraxa things.',
    },
    {
      name: 'Jordan',
      isGuest: false,
      deck: { name: 'Yuriko', commander: null },
      finalLife: 12,
      isWinner: true,
      deathCause: 'none',
      deathAt: null,
      note: null,
    },
  ])
})

test("buildRecapPlayers shows a guest's note under the guest name", () => {
  const [morgan] = buildRecapPlayers(
    [row({ memberId: null, memberName: null, guestName: 'Morgan', takeaway: 'Goblins forever.' })],
    {},
    startedAt,
  )
  assert.strictEqual(morgan?.name, 'Morgan')
  assert.strictEqual(morgan?.isGuest, true)
  assert.strictEqual(morgan?.note, 'Goblins forever.')
})

test('buildRecapPlayers gives a "Deleted player" seat without a response a null note', () => {
  const [deleted] = buildRecapPlayers(
    [row({ memberId: null, memberName: null, guestName: 'Deleted player', takeaway: null })],
    {},
    startedAt,
  )
  assert.strictEqual(deleted?.name, 'Deleted player')
  assert.strictEqual(deleted?.note, null)
})

// ── parseAbandonReasons ───────────────────────────────────────────────────────

test('parseAbandonReasons keeps string ids and drops non-strings and non-arrays', () => {
  assert.deepStrictEqual(parseAbandonReasons(null), [])
  assert.deepStrictEqual(parseAbandonReasons('time'), [])
  assert.deepStrictEqual(parseAbandonReasons({ 0: 'time' }), [])
  assert.deepStrictEqual(parseAbandonReasons(['time', 3, null, 'other']), ['time', 'other'])
})

// ── retireDetails ─────────────────────────────────────────────────────────────

test('retireDetails returns reasons and trimmed notes for abandoned games', () => {
  assert.deepStrictEqual(
    retireDetails('abandoned', ['time', 'other'], '  Venue closed early.  '),
    { abandonReasons: ['time', 'other'], abandonNotes: 'Venue closed early.' },
  )
  assert.deepStrictEqual(retireDetails('abandoned', null, '   '), { abandonReasons: [], abandonNotes: null })
})

test('retireDetails returns no reasons and no notes for won and draw games even if columns hold data', () => {
  for (const endReason of ['won', 'draw']) {
    assert.deepStrictEqual(
      retireDetails(endReason, ['time'], 'stale note'),
      { abandonReasons: [], abandonNotes: null },
    )
  }
})

// ── abandonNotesToStore ───────────────────────────────────────────────────────

test('abandonNotesToStore trims, maps blank to null and ignores notes on non-abandoned games', () => {
  assert.strictEqual(abandonNotesToStore('abandoned', '  Venue closed.  '), 'Venue closed.')
  assert.strictEqual(abandonNotesToStore('abandoned', '   '), null)
  assert.strictEqual(abandonNotesToStore('abandoned', undefined), null)
  assert.strictEqual(abandonNotesToStore('won', 'Venue closed.'), null)
  assert.strictEqual(abandonNotesToStore('draw', 'Venue closed.'), null)
})
