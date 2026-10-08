import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../helper.ts'

// Auth-gated outcomes (401/403) need Better Auth's database, which the test env
// doesn't have. Body validation runs before the requireAuth preHandler, so a
// rejected body answers 400 without touching it; a valid body would not.

const POD_ID = '11111111-1111-4111-8111-111111111111'
const DECK_ID = '22222222-2222-4222-8222-222222222222'

function seat(name: string) {
  return {
    name,
    isGuest: true,
    memberId: null,
    deckId: DECK_ID,
    finalLife: 40,
    poison: 0,
    deathCause: 'none',
    deathAt: null,
    isWinner: false,
    surveyFun: null,
    surveyAgency: null,
    surveyTakeaway: '',
  }
}

function retiredGame(abandonNotes: unknown) {
  return {
    podId: POD_ID,
    durationSec: 1200,
    endReason: 'abandoned',
    abandonReasons: ['other'],
    abandonNotes,
    players: [seat('Morgan'), seat('Sam')],
  }
}

test('POST /api/games rejects abandonNotes longer than 500 characters with 400 BAD_REQUEST', async (t) => {
  const app = await build(t)

  const res = await app.inject({ method: 'POST', url: '/api/games', payload: retiredGame('x'.repeat(501)) })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.json().error.code, 'BAD_REQUEST')
})

test('POST /api/games rejects a non-string abandonNotes with 400 BAD_REQUEST', async (t) => {
  const app = await build(t)

  const res = await app.inject({ method: 'POST', url: '/api/games', payload: retiredGame(42) })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.json().error.code, 'BAD_REQUEST')
})
