import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from './env.ts'
import * as schema from '../db/schema.ts'

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
export type Db = typeof db
