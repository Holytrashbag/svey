import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { AppError } from '../lib/errors.ts'

// Codes for client errors raised by Fastify itself or its plugins (schema
// validation, malformed JSON, multipart size limits, …).
const CLIENT_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'TOO_MANY_REQUESTS',
}

function clientStatus(err: unknown): number | null {
  if (!(err instanceof Error) || !('statusCode' in err)) return null
  const status = err.statusCode
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null
}

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((err: unknown, request, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } })
    }
    // Framework-level 4xx errors describe the request, not the server, so their
    // messages are safe to return. Anything else is unexpected → generic 500.
    const status = clientStatus(err)
    if (status !== null && err instanceof Error) {
      const code = CLIENT_ERROR_CODES[status] ?? 'BAD_REQUEST'
      return reply.code(status).send({ error: { code, message: err.message } })
    }
    request.log.error(err)
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  })

  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
    })
  })
}

export default fp(errorHandlerPlugin)
