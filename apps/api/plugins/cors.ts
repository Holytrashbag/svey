import fp from 'fastify-plugin'
import fastifyCors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'
import { env } from '../lib/env.ts'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(fastifyCors, {
    origin: [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  })
}

export default fp(corsPlugin)
