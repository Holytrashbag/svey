#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, 'migrations')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    const applied = new Set(
      (await client.query('SELECT filename FROM _migrations')).rows.map((r: { filename: string }) => r.filename)
    )

    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file}`)
        continue
      }
      const sql = await readFile(path.join(migrationsDir, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`apply ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
