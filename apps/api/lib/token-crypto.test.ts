import { test } from 'node:test'
import assert from 'node:assert'
import { decryptToken, encryptToken, isEncryptedToken } from './token-crypto.ts'

const TOKEN = 'ya29.a0AfH6SMBx-example-oauth-access-token'

test('encrypt → decrypt round-trips the original token', () => {
  const encrypted = encryptToken(TOKEN)
  assert.ok(isEncryptedToken(encrypted))
  assert.ok(!encrypted.includes(TOKEN))
  assert.strictEqual(decryptToken(encrypted), TOKEN)
})

test('uses a fresh IV, so equal tokens encrypt differently', () => {
  assert.notStrictEqual(encryptToken(TOKEN), encryptToken(TOKEN))
})

test('never double-encrypts an already encrypted value', () => {
  const once = encryptToken(TOKEN)
  assert.strictEqual(encryptToken(once), once)
})

test('passes legacy plaintext through unchanged', () => {
  assert.ok(!isEncryptedToken(TOKEN))
  assert.strictEqual(decryptToken(TOKEN), TOKEN)
})

test('rejects a tampered ciphertext (GCM auth tag check)', () => {
  const encrypted = encryptToken(TOKEN)
  const raw = Buffer.from(encrypted.slice('enc:v1:'.length), 'base64')
  raw[raw.length - 1] = (raw[raw.length - 1] ?? 0) ^ 0xff
  const tampered = 'enc:v1:' + raw.toString('base64')
  assert.throws(() => decryptToken(tampered))
})
