export type E2eDatabaseTarget = {
  adminUrl: string
  database: string
}

export function e2eDatabaseTarget(_databaseUrl: string): E2eDatabaseTarget {
  throw new Error('not implemented')
}
