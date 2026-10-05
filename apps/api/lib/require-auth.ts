import type { FastifyRequest, FastifyReply } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth.ts'
import { Errors } from './errors.ts'

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
  if (!session) throw Errors.unauthorized('Not authenticated')
  request.user = session.user
}

declare module 'fastify' {
  interface FastifyRequest {
    user: typeof auth.$Infer.Session.user
  }
}
