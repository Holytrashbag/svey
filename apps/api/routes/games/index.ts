import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../lib/db.ts'
import { requireAuth } from '../../lib/require-auth.ts'
import * as gameService from '../../services/game.service.ts'

const CreateGamePlayerSchema = z.object({
  name:           z.string().min(1),
  isGuest:        z.boolean(),
  memberId:       z.string().uuid().nullable(),
  deckId:         z.string().uuid(),
  finalLife:      z.number().int(),
  poison:         z.number().int().min(0),
  deathCause:     z.enum(['life', 'cmdr_dmg', 'poison', 'conceded', 'special', 'none']),
  deathAt:        z.number().int().min(0).nullable(),
  isWinner:       z.boolean(),
  surveyFun:      z.number().int().min(1).max(5).nullable(),
  surveyAgency:   z.number().int().min(1).max(5).nullable(),
  surveyTakeaway: z.string(),
})

const CreateGameSchema = z.object({
  podId:       z.string().uuid(),
  durationSec: z.number().int().min(0),
  endReason:   z.enum(['won', 'draw', 'abandoned']),
  abandonReasons: z.array(z.string().max(32)).max(10).optional(),
  abandonNotes: z.string().max(500).optional(),
  players:     z.array(CreateGamePlayerSchema).min(2),
})

const IdParamsSchema = z.object({
  id: z.string().uuid(),
})

const games: FastifyPluginAsync = async (fastify) => {
  const f = fastify.withTypeProvider<ZodTypeProvider>()
  f.addHook('preHandler', requireAuth)

  f.post('/', { schema: { body: CreateGameSchema } }, async (request, reply) => {
    const gameId = await gameService.createGame(db, request.user.id, request.body)
    return reply.code(201).send({ id: gameId })
  })

  f.get('/:id', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const detail = await gameService.getGameDetail(db, request.params.id, request.user.id)
    return reply.send(detail)
  })

  f.delete('/:id', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    await gameService.deleteGame(db, request.params.id, request.user.id)
    return reply.code(204).send()
  })
}

export default games
