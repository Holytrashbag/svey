// Drops and recreates the end-to-end suite's database, so every Playwright run
// starts from the same freshly migrated and seeded state:
//   pnpm --filter api e2e:prepare   (reset → migrate → seed, reads .env.e2e)
// Only touches databases named *_e2e (see lib/e2e-database.ts). Waits for
// Postgres to accept connections, because `pnpm db:up` returns before it does.
// Reads DATABASE_URL directly instead of lib/env.ts: nothing else is needed.
import pg from 'pg'
import { e2eDatabaseTarget } from '../lib/e2e-database.ts'

if (process.env.NODE_ENV === 'production') {
  console.error('[e2e] refusing to reset a database in production')
  process.exit(1)
}

const { adminUrl, database } = e2eDatabaseTarget(process.env.DATABASE_URL ?? '')

async function connect(): Promise<pg.Client> {
  for (let attempt = 1; ; attempt++) {
    const client = new pg.Client({ connectionString: adminUrl })
    try {
      await client.connect()
      return client
    } catch (err) {
      await client.end().catch(() => {})
      if (attempt >= 30) throw err
      if (attempt === 1) console.log('[e2e] waiting for Postgres…')
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

async function reset() {
  const client = await connect()
  try {
    // DDL on the database itself has no Drizzle equivalent. The name is safe
    // to quote: e2eDatabaseTarget only accepts [a-z0-9_]+_e2e.
    await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    await client.query(`CREATE DATABASE "${database}"`)
    console.log(`[e2e] recreated database ${database}`)
  } finally {
    await client.end()
  }
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})
