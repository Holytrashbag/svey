import { fileURLToPath } from 'node:url'
import path from 'node:path'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import { type FastifyPluginAsync } from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export type AppOptions = Partial<AutoloadPluginOptions>
export const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts) => {
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Global plugins (cors, error handler, uploads static server, etc.) register
  // at the root so their decorators, hooks and routes apply app-wide.
  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: opts,
    forceESM: true,
  })

  // All API routes live under a single `/api` prefix so the backend can be
  // deployed on one origin alongside the SPA without path collisions
  // (e.g. the SPA's `/decks` route vs the decks API endpoint).
  void fastify.register(
    async (api) => {
      void api.register(AutoLoad, {
        dir: path.join(__dirname, 'routes'),
        options: opts,
        forceESM: true,
      })
    },
    { prefix: '/api' },
  )
}

export default app
