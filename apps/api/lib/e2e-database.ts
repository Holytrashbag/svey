// Guard for the end-to-end suite's database reset (jobs/reset-e2e-database.ts).
// That job drops and recreates the database, so it only ever touches one whose
// name ends in `_e2e` — an exported DATABASE_URL pointing at the dev database
// must never get wiped. The name is also used as a quoted SQL identifier, so
// only plain lower-case identifiers are accepted.

export type E2eDatabaseTarget = {
  // Same server and credentials, connected to the `postgres` maintenance
  // database (a database can't be dropped while connected to it).
  adminUrl: string
  database: string
}

const E2E_DATABASE_NAME = /^[a-z0-9_]+_e2e$/

export function e2eDatabaseTarget(databaseUrl: string): E2eDatabaseTarget {
  const url = new URL(databaseUrl)
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!E2E_DATABASE_NAME.test(database)) {
    throw new Error(`refusing to touch database "${database}": e2e database names must end in _e2e`)
  }
  url.pathname = '/postgres'
  return { adminUrl: url.toString(), database }
}
