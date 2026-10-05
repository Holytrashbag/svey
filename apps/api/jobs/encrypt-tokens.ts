// One-off backfill: encrypt any plaintext OAuth tokens already stored in
// oauth_account (rows written before at-rest encryption was enabled).
// Idempotent — already-encrypted values are skipped. Run with:
//   pnpm --filter api encrypt-tokens
import { eq } from 'drizzle-orm'
import { pgTable, uuid, text } from 'drizzle-orm/pg-core'
import { db, pool } from '../lib/db.ts'
import { encryptToken, isEncryptedToken } from '../lib/token-crypto.ts'

// Local handle for the Better-Auth-managed table (not part of db/schema.ts).
const oauthAccount = pgTable('oauth_account', {
  id: uuid('id').primaryKey(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
})

const rows = await db.select().from(oauthAccount)
let updated = 0

for (const row of rows) {
  const patch: Partial<{ accessToken: string; refreshToken: string; idToken: string }> = {}
  if (row.accessToken && !isEncryptedToken(row.accessToken)) patch.accessToken = encryptToken(row.accessToken)
  if (row.refreshToken && !isEncryptedToken(row.refreshToken)) patch.refreshToken = encryptToken(row.refreshToken)
  if (row.idToken && !isEncryptedToken(row.idToken)) patch.idToken = encryptToken(row.idToken)

  if (Object.keys(patch).length > 0) {
    await db.update(oauthAccount).set(patch).where(eq(oauthAccount.id, row.id))
    updated++
  }
}

console.log(`[encrypt-tokens] encrypted tokens for ${updated} of ${rows.length} oauth account(s)`)
await pool.end()
