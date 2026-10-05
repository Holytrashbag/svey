import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../lib/db.ts'
import { requireAuth } from '../../lib/require-auth.ts'
import * as playgroupService from '../../services/playgroup.service.ts'

const CreatePlaygroupSchema = z.object({
  name: z.string().min(2).max(64),
})

const JoinPlaygroupSchema = z.object({
  code: z.string().min(1),
})

const UpdateMemberSchema = z.object({
  accept:  z.boolean().optional(),
  approve: z.boolean().optional(),
  role:    z.enum(['admin', 'member']).optional(),
})

const TransferOwnerSchema = z.object({
  memberId: z.string().uuid(),
})

const IdParamsSchema = z.object({
  id: z.string().uuid(),
})

const MemberParamsSchema = z.object({
  id:       z.string().uuid(),
  memberId: z.string().uuid(),
})

const playgroups: FastifyPluginAsync = async (fastify) => {
  const f = fastify.withTypeProvider<ZodTypeProvider>()
  f.addHook('preHandler', requireAuth)

  f.get('/', async (request, reply) => {
    const result = await playgroupService.listPlaygroups(db, request.user.id)
    return reply.send(result)
  })

  f.post('/', { schema: { body: CreatePlaygroupSchema } }, async (request, reply) => {
    const result = await playgroupService.createPlaygroup(db, request.user.id, request.user.name, request.body)
    return reply.code(201).send(result)
  })

  f.post('/join', { schema: { body: JoinPlaygroupSchema } }, async (request, reply) => {
    const result = await playgroupService.joinPlaygroup(db, request.user.id, request.user.name, request.body.code)
    return reply.send(result)
  })

  f.get('/:id', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const detail = await playgroupService.getPlaygroupDetail(db, request.user.id, request.params.id)
    return reply.send(detail)
  })

  f.patch('/:id/members/:memberId', { schema: { body: UpdateMemberSchema, params: MemberParamsSchema } }, async (request, reply) => {
    if (request.body.accept === true) {
      await playgroupService.acceptInvite(db, request.user.id, request.params.memberId)
    } else if (request.body.approve === true) {
      await playgroupService.approveMember(db, request.user.id, request.params.id, request.params.memberId)
    } else if (request.body.role) {
      await playgroupService.updateMemberRole(db, request.user.id, request.params.id, request.params.memberId, request.body.role)
    }
    return reply.code(204).send()
  })

  f.delete('/:id/members/:memberId', { schema: { params: MemberParamsSchema } }, async (request, reply) => {
    await playgroupService.removeMember(db, request.user.id, request.params.id, request.params.memberId)
    return reply.code(204).send()
  })

  f.get('/:id/pending', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const result = await playgroupService.listPendingMembers(db, request.user.id, request.params.id)
    return reply.send(result)
  })

  f.post('/:id/regenerate-invite', { schema: { params: IdParamsSchema } }, async (request, reply) => {
    const result = await playgroupService.regenerateInviteCode(db, request.user.id, request.params.id)
    return reply.send(result)
  })

  f.post('/:id/transfer-owner', { schema: { body: TransferOwnerSchema, params: IdParamsSchema } }, async (request, reply) => {
    await playgroupService.transferOwnership(db, request.user.id, request.params.id, request.body.memberId)
    return reply.code(204).send()
  })
}

export default playgroups
