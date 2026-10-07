import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../helper.ts'

// Auth-gated outcomes (401/403) need Better Auth's database, which the test
// env doesn't have; those decisions are unit-tested in lib/pod-decks.test.ts.

test('GET /api/playgroups/not-a-uuid/decks returns 400 BAD_REQUEST in the error envelope', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/api/playgroups/not-a-uuid/decks' })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.json().error.code, 'BAD_REQUEST')
})
