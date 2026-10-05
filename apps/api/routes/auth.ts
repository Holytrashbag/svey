import type { FastifyPluginAsync } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth.ts'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`)
      const req = new Request(url.toString(), {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      })

      const response = await auth.handler(req)

      reply.status(response.status)

      // getSetCookie() returns each Set-Cookie as a separate array entry,
      // preserving multiple cookies that Headers.forEach() would collapse.
      const setCookies = response.headers.getSetCookie?.()
      if (setCookies?.length) {
        reply.header('Set-Cookie', setCookies)
      }

      response.headers.forEach((value, key) => {
        // Skip Set-Cookie (handled above) and CORS headers (@fastify/cors adds them)
        if (key.toLowerCase() === 'set-cookie') return
        if (key.toLowerCase().startsWith('access-control-')) return
        reply.header(key, value)
      })

      const text = await response.text()
      return reply.send(text || null)
    },
  })

  fastify.get('/me', async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    return reply.send(session)
  })
}

export default authRoutes
