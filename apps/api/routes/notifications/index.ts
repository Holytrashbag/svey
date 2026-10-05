import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../lib/db.ts'
import { requireAuth } from '../../lib/require-auth.ts'
import * as notificationService from '../../services/notification.service.ts'

const IdParamsSchema = z.object({
  id: z.string().uuid(),
})

const notifications: FastifyPluginAsync = async (fastify) => {
  const f = fastify.withTypeProvider<ZodTypeProvider>()
  f.addHook('preHandler', requireAuth)

  f.get('/', async (request, reply) => {
    const [items, unreadCount] = await Promise.all([
      notificationService.listNotifications(db, request.user.id),
      notificationService.getUnreadCount(db, request.user.id),
    ])
    return reply.send({ notifications: items, unreadCount })
  })

  f.post('/read-all', async (request, reply) => {
    await notificationService.markAllRead(db, request.user.id)
    return reply.code(204).send()
  })

  f.post('/:id/read', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    await notificationService.markRead(db, request.user.id, request.params.id)
    return reply.code(204).send()
  })
}

export default notifications
