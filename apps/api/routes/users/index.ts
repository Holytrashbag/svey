import path from 'node:path'
import fs from 'node:fs'
import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { pgTable, uuid, text as pgText, timestamp } from 'drizzle-orm/pg-core'
import { db } from '../../lib/db.ts'
import { env } from '../../lib/env.ts'
import { requireAuth } from '../../lib/require-auth.ts'
import { AVATARS_DIR } from '../../plugins/uploads.ts'
import * as statsService from '../../services/stats.service.ts'

const authUser = pgTable('user', {
  id:        uuid('id').primaryKey(),
  avatarUrl: pgText('avatar_url'),
  updatedAt: timestamp('updated_at'),
})

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

const users: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth)

  fastify.get('/me/stats', async (request, reply) => {
    const stats = await statsService.getPlayerStats(db, request.user.id)
    return reply.send(stats)
  })

  fastify.get('/me/deck-stats', async (request, reply) => {
    const deckStats = await statsService.getPlayerDeckStats(db, request.user.id)
    return reply.send({ deckStats })
  })

  fastify.post('/me/avatar', async (request, reply) => {
    const file = await request.file()
    if (!file) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'File must be an image (JPEG, PNG, WebP, or GIF)' } })
    }

    const ext = EXT_MAP[file.mimetype]
    const filename = `${request.user.id}.${ext}`
    const destPath = path.join(AVATARS_DIR, filename)

    for (const existing of fs.readdirSync(AVATARS_DIR)) {
      if (existing.startsWith(request.user.id + '.') && existing !== filename) {
        fs.unlinkSync(path.join(AVATARS_DIR, existing))
      }
    }

    const chunks: Buffer[] = []
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer)
    }
    fs.writeFileSync(destPath, Buffer.concat(chunks))

    const avatarUrl = `${env.BETTER_AUTH_URL}/uploads/avatars/${filename}`
    await db.update(authUser).set({ avatarUrl, updatedAt: new Date() }).where(eq(authUser.id, request.user.id))

    return reply.send({ avatarUrl })
  })
}

export default users
