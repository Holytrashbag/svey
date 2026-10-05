import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { schedule } from 'node-cron'
import { db } from '../lib/db.ts'
import { env } from '../lib/env.ts'
import { cleanupOrphanedData } from '../services/cleanup.service.ts'

// Nightly garbage collection of empty playgroups (with their games + stats) and
// decks orphaned by account deletion. Runs in-process and assumes a single API
// instance; the cleanup is idempotent, so an occasional double-run is harmless.
const scheduledJobs: FastifyPluginAsync = async (fastify) => {
  // Don't spin up background timers under the test runner.
  if (env.NODE_ENV === 'test') return

  const task = schedule(
    '30 3 * * *',
    async () => {
      try {
        const result = await cleanupOrphanedData(db)
        if (result.playgroups || result.games || result.decks) {
          fastify.log.info({ cleanup: result }, 'orphan cleanup removed data')
        }
      } catch (err) {
        fastify.log.error({ err }, 'orphan cleanup failed')
      }
    },
    { timezone: 'Europe/Berlin', name: 'orphan-cleanup', noOverlap: true },
  )

  fastify.addHook('onClose', async () => {
    await task.destroy()
  })
}

export default fp(scheduledJobs)
