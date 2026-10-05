import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../lib/db.ts'
import { requireAuth } from '../../lib/require-auth.ts'
import * as deckService from '../../services/deck.service.ts'
import * as statsService from '../../services/stats.service.ts'

const ImportDeckSchema = z.object({
  url: z.string().url(),
})

const UpdateDeckSchema = z.object({
  name:            z.string().min(1).max(64).optional(),
  bracketOverride: z.number().int().min(1).max(5).nullable().optional(),
  isArchived:      z.boolean().optional(),
})

const IdParamsSchema = z.object({
  id: z.string().uuid(),
})

const decks: FastifyPluginAsync = async (fastify) => {
  const f = fastify.withTypeProvider<ZodTypeProvider>()
  f.addHook('preHandler', requireAuth)

  f.post('/import', { schema: { body: ImportDeckSchema } }, async (request, reply) => {
    const id = await deckService.importDeck(db, request.user.id, request.body.url)
    return reply.code(201).send({ id })
  })

  f.get('/', async (request, reply) => {
    const decks = await deckService.listDecks(db, request.user.id)
    return reply.send({ decks })
  })

  f.get('/:id', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const detail = await deckService.getDeckDetail(db, request.user.id, request.params.id)
    return reply.send(detail)
  })

  f.post('/:id/sync', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const detail = await deckService.syncDeck(db, request.user.id, request.params.id)
    return reply.send(detail)
  })

  f.get('/:id/stats', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const stats = await statsService.getDeckStats(db, request.user.id, request.params.id)
    return reply.send(stats)
  })

  f.patch('/:id', { schema: { body: UpdateDeckSchema, params: IdParamsSchema } }, async (request, reply) => {
    await deckService.updateDeck(db, request.user.id, request.params.id, request.body)
    return reply.send({ id: request.params.id })
  })
}

export default decks
