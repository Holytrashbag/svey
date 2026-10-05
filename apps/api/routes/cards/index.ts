import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getCardArt, getCardMeta, CARD_ART_VERSIONS } from '../../lib/scryfall.ts'

// Public on purpose (no requireAuth): it returns only public MTG card art keyed
// by a Scryfall oracle id or card name — never an arbitrary URL — so it can't be
// abused as an open proxy. Routing card images through here means the visitor's
// browser never contacts Scryfall directly, avoiding the EU->US transfer of their IP.
const ArtQuerySchema = z
  .object({
    oracleId: z.string().uuid().optional(),
    name:     z.string().min(1).max(200).optional(),
    version:  z.enum(CARD_ART_VERSIONS).default('art_crop'),
  })
  .refine((q) => q.oracleId || q.name, { message: 'Provide an oracleId or name.' })

// Card metadata for attribution. Scryfall requires the illustrator be
// identifiable wherever we render the art_crop, so the frontend reads it here.
const MetaQuerySchema = z
  .object({
    oracleId: z.string().uuid().optional(),
    name:     z.string().min(1).max(200).optional(),
  })
  .refine((q) => q.oracleId || q.name, { message: 'Provide an oracleId or name.' })

const MetaResponseSchema = z.object({ artist: z.string().nullable() })

const cards: FastifyPluginAsync = async (fastify) => {
  const f = fastify.withTypeProvider<ZodTypeProvider>()

  f.get('/art', { schema: { querystring: ArtQuerySchema } }, async (request, reply) => {
    const { oracleId, name, version } = request.query
    const art = await getCardArt({ oracleId, name }, version)
    return reply
      .header('Cache-Control', 'public, max-age=2592000, immutable')
      .type(art.contentType)
      .send(art.data)
  })

  f.get(
    '/meta',
    { schema: { querystring: MetaQuerySchema, response: { 200: MetaResponseSchema } } },
    async (request, reply) => {
      const { oracleId, name } = request.query
      const meta = await getCardMeta({ oracleId, name })
      return reply.header('Cache-Control', 'public, max-age=2592000, immutable').send(meta)
    },
  )
}

export default cards
