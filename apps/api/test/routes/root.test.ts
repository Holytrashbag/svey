import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../helper.ts'

test('GET /api/health reports ok', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/api/health' })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), { status: 'ok' })
})

test('unknown API routes return a normalised 404', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/api/does-not-exist' })
  assert.strictEqual(res.statusCode, 404)
  assert.strictEqual(res.json().error.code, 'NOT_FOUND')
})
