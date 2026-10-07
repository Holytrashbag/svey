import { test } from 'node:test'
import assert from 'node:assert'
import { e2eDatabaseTarget } from './e2e-database.ts'

test('targets the postgres maintenance database for svey_e2e', () => {
  const target = e2eDatabaseTarget('postgresql://postgres:postgres@localhost:5432/svey_e2e')
  assert.strictEqual(target.database, 'svey_e2e')
  assert.strictEqual(target.adminUrl, 'postgresql://postgres:postgres@localhost:5432/postgres')
})

test('keeps credentials, host, port and query string', () => {
  const target = e2eDatabaseTarget('postgres://ci:s3cret@db.internal:6543/app_e2e?sslmode=disable')
  assert.strictEqual(target.database, 'app_e2e')
  assert.strictEqual(target.adminUrl, 'postgres://ci:s3cret@db.internal:6543/postgres?sslmode=disable')
})

test('refuses a database not ending in _e2e', () => {
  assert.throws(
    () => e2eDatabaseTarget('postgresql://postgres:postgres@localhost:5432/svey'),
    /refusing to touch database "svey"/,
  )
})

test('refuses names that are not plain identifiers', () => {
  assert.throws(() => e2eDatabaseTarget('postgresql://localhost/svey-e2e'), /refusing/)
  assert.throws(() => e2eDatabaseTarget('postgresql://localhost/x%3Bdrop_e2e'), /refusing/)
  assert.throws(() => e2eDatabaseTarget('postgresql://localhost/Svey_e2e'), /refusing/)
})

test('refuses a URL without a database name', () => {
  assert.throws(() => e2eDatabaseTarget('postgresql://localhost:5432'), /refusing/)
  assert.throws(() => e2eDatabaseTarget('postgresql://localhost:5432/'), /refusing/)
})
