// Standalone one-off runner for the orphan cleanup, for manual use or an
// external scheduler:  pnpm --filter api cleanup
import { db, pool } from '../lib/db.ts'
import { cleanupOrphanedData } from '../services/cleanup.service.ts'

const result = await cleanupOrphanedData(db)
console.log('[cleanup] removed', result)
await pool.end()
