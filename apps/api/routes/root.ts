import type { FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify) => {
  // Lightweight liveness probe for uptime monitoring (served at /api/health).
  fastify.get('/health', async () => ({ status: 'ok' }))
}

export default root
