import crypto from 'node:crypto'
import { env } from './env.ts'

// Encrypts OAuth tokens (access/refresh/id) at rest with AES-256-GCM. The key is
// derived from BETTER_AUTH_SECRET via HKDF, so it is distinct from the auth
// secret itself and needs no extra environment variable. Stored values look like
// `enc:v1:<base64(iv | authTag | ciphertext)>`; any value without that prefix is
// treated as legacy plaintext and passed through unchanged, so the change is
// backward-compatible and decryption stays safe for not-yet-migrated rows.

const PREFIX = 'enc:v1:'
const IV_BYTES = 12
const TAG_BYTES = 16

const KEY = Buffer.from(
  crypto.hkdfSync(
    'sha256',
    env.BETTER_AUTH_SECRET,
    Buffer.from('svey:oauth-token'), // salt
    Buffer.from('token-encryption-v1'), // info — separates this key from the auth secret
    32,
  ),
)

/** True if the value is one of our AES-GCM encrypted token strings. */
export function isEncryptedToken(value: string): boolean {
  return value.startsWith(PREFIX)
}

export function encryptToken(value: string): string {
  if (isEncryptedToken(value)) return value // never double-wrap
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptToken(value: string): string {
  if (!isEncryptedToken(value)) return value // legacy plaintext
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
