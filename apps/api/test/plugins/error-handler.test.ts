import { test } from 'node:test'
import assert from 'node:assert'
import Fastify from 'fastify'
import errorHandler from '../../plugins/error-handler.ts'
import { Errors } from '../../lib/errors.ts'

async function buildApp() {
  const app = Fastify()
  await app.register(errorHandler)
  app.get('/domain-error', async () => {
    throw Errors.conflict('That name is already taken')
  })
  app.get('/crash', async () => {
    throw new Error('connect ECONNREFUSED 10.0.0.5:5432 (password=hunter2)')
  })
  app.post('/echo', async (request) => request.body)
  app.get('/too-large', async () => {
    // Shape of the error @fastify/multipart throws when a file exceeds its limit.
    throw Object.assign(new Error('request file too large'), { statusCode: 413 })
  })
  await app.ready()
  return app
}

test('AppError is returned with its status, code and message', async (t) => {
  const app = await buildApp()
  t.after(() => app.close())

  const res = await app.inject({ url: '/domain-error' })
  assert.strictEqual(res.statusCode, 409)
  assert.deepStrictEqual(res.json(), {
    error: { code: 'CONFLICT', message: 'That name is already taken' },
  })
})

test('unexpected errors become a generic 500 without leaking internals', async (t) => {
  const app = await buildApp()
  t.after(() => app.close())

  const res = await app.inject({ url: '/crash' })
  assert.strictEqual(res.statusCode, 500)
  assert.deepStrictEqual(res.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  })
  assert.ok(!res.body.includes('hunter2'))
})

test('framework client errors keep their 4xx status instead of becoming 500s', async (t) => {
  const app = await buildApp()
  t.after(() => app.close())

  const malformed = await app.inject({
    method: 'POST',
    url: '/echo',
    headers: { 'content-type': 'application/json' },
    payload: '{"not": json',
  })
  assert.strictEqual(malformed.statusCode, 400)
  assert.strictEqual(malformed.json().error.code, 'BAD_REQUEST')

  const tooLarge = await app.inject({ url: '/too-large' })
  assert.strictEqual(tooLarge.statusCode, 413)
  assert.deepStrictEqual(tooLarge.json(), {
    error: { code: 'PAYLOAD_TOO_LARGE', message: 'request file too large' },
  })
})

test('unknown routes use the same error envelope', async (t) => {
  const app = await buildApp()
  t.after(() => app.close())

  const res = await app.inject({ url: '/nope' })
  assert.strictEqual(res.statusCode, 404)
  assert.strictEqual(res.json().error.code, 'NOT_FOUND')
})
