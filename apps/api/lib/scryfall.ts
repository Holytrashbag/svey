import path from 'node:path'
import fsp from 'node:fs/promises'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { env } from './env.ts'
import { Errors } from './errors.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Mirror the uploads plugin's resolution so the art cache lands on the same
// persistent volume in production (UPLOADS_DIR) and a local folder in dev.
const CARD_ART_DIR = path.join(
  env.UPLOADS_DIR ? path.resolve(env.UPLOADS_DIR) : path.join(__dirname, '..', 'uploads'),
  'card-art',
)

// Image sizes Scryfall can return; these are also the keys in `image_uris`.
export const CARD_ART_VERSIONS = ['art_crop', 'normal', 'small', 'large', 'border_crop', 'png'] as const
export type CardArtVersion = (typeof CARD_ART_VERSIONS)[number]

export type CardArt = { data: Buffer; contentType: string }

// A card reference. Note `oracleId` is Scryfall's *oracle_id* (the gameplay card
// across printings) — which is what we store throughout the app (Archidekt's
// `oracleCard.uid`). It is NOT a Scryfall card id, so it must be resolved via
// search rather than the `/cards/:id` endpoint.
export type CardRef = { oracleId?: string; name?: string }

// Scryfall asks API consumers to identify themselves with a User-Agent and to
// cache image assets locally — both of which this client does.
const USER_AGENT = 'Svey/1.0 (+https://svey.app)'
const FETCH_TIMEOUT_MS = 8000

const ImageUrisSchema = z
  .object({
    art_crop:    z.string().url(),
    normal:      z.string().url(),
    small:       z.string().url(),
    large:       z.string().url(),
    border_crop: z.string().url(),
    png:         z.string().url(),
  })
  .partial()

// Card art lives at the top level for single-faced cards and on each face for
// double-faced ones.
const SearchResponseSchema = z.object({
  data: z.array(
    z.object({
      image_uris: ImageUrisSchema.optional(),
      card_faces: z.array(z.object({ image_uris: ImageUrisSchema.optional() })).optional(),
    }),
  ),
})

// Only the `png` size is a PNG; every other size Scryfall serves is JPEG.
function contentTypeFor(version: CardArtVersion): string {
  return version === 'png' ? 'image/png' : 'image/jpeg'
}

function cacheKey(ref: CardRef, version: CardArtVersion): string {
  const base = ref.oracleId
    ? `oracle-${ref.oracleId}`
    : `name-${crypto.createHash('sha1').update(ref.name!.toLowerCase()).digest('hex')}`
  const ext = version === 'png' ? 'png' : 'jpg'
  return `${base}_${version}.${ext}`
}

// Dedupe concurrent cold-cache fetches for the same asset so a burst of tiles
// requesting the same commander hits Scryfall once, not N times.
const inFlight = new Map<string, Promise<CardArt>>()

/**
 * Returns MTG card art, served from a local disk cache and fetched from
 * Scryfall on a miss. Card art is immutable per (card, version), so cached
 * files never need invalidation.
 */
export async function getCardArt(ref: CardRef, version: CardArtVersion = 'art_crop'): Promise<CardArt> {
  if (!ref.oracleId && !ref.name) throw Errors.badRequest('Card oracleId or name is required.')

  const key = cacheKey(ref, version)
  const filePath = path.join(CARD_ART_DIR, key)
  const contentType = contentTypeFor(version)

  try {
    const data = await fsp.readFile(filePath)
    return { data, contentType }
  } catch {
    // Cache miss — fall through to fetch.
  }

  const existing = inFlight.get(key)
  if (existing) return existing

  const task = fetchAndCache(ref, version, filePath, contentType).finally(() => inFlight.delete(key))
  inFlight.set(key, task)
  return task
}

async function fetchAndCache(
  ref: CardRef,
  version: CardArtVersion,
  filePath: string,
  contentType: string,
): Promise<CardArt> {
  // By name, Scryfall serves the image directly (302 → image, fetch follows it).
  // By oracle id, we must first resolve the card to an image URL via search.
  const imageUrl = ref.oracleId
    ? await resolveOracleImageUrl(ref.oracleId, version)
    : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(ref.name!)}&format=image&version=${version}`

  const data = await fetchImageBytes(imageUrl)

  // Write to a temp file then rename, so a crash mid-write can't leave a
  // truncated file that a later request would serve as a valid cache hit.
  await fsp.mkdir(CARD_ART_DIR, { recursive: true })
  const tmp = `${filePath}.${process.pid}.tmp`
  await fsp.writeFile(tmp, data)
  await fsp.rename(tmp, filePath)

  return { data, contentType }
}

async function resolveOracleImageUrl(oracleId: string, version: CardArtVersion): Promise<string> {
  const searchUrl = `https://api.scryfall.com/cards/search?q=oracleid%3A${encodeURIComponent(oracleId)}&unique=cards`

  let res: Response
  try {
    res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    throw Errors.badRequest('Could not reach Scryfall.')
  }

  if (res.status === 404) throw Errors.notFound('Card art not found.') // no card with that oracle id
  if (!res.ok) throw Errors.badRequest(`Scryfall returned ${res.status}.`)

  const parsed = SearchResponseSchema.safeParse(await res.json())
  const card = parsed.success ? parsed.data.data[0] : undefined
  const url = card?.image_uris?.[version] ?? card?.card_faces?.[0]?.image_uris?.[version]
  if (!url) throw Errors.notFound('Card art not found.')
  return url
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    throw Errors.badRequest('Could not reach Scryfall.')
  }

  if (res.status === 404) throw Errors.notFound('Card art not found.')
  if (!res.ok) throw Errors.badRequest(`Scryfall returned ${res.status}.`)

  return Buffer.from(await res.arrayBuffer())
}

// ── Card metadata (illustrator) ──────────────────────────────────────────────
// Scryfall requires that whenever we display the `art_crop`, the illustrator is
// identifiable in the same interface. We resolve + cache the artist name so the
// frontend can credit it. Like the art itself, the artist is immutable per card,
// so the cached JSON never needs invalidation.

const CardJsonSchema = z.object({
  artist:     z.string().optional(),
  card_faces: z.array(z.object({ artist: z.string().optional() })).optional(),
})
const SearchJsonSchema = z.object({ data: z.array(CardJsonSchema) })

export type CardMeta = { artist: string | null }

// Dedupe concurrent cold-cache lookups for the same card (e.g. four tiles all
// asking for the same commander when the game menu opens).
const inFlightMeta = new Map<string, Promise<CardMeta>>()

function metaCacheKey(ref: CardRef): string {
  const base = ref.oracleId
    ? `oracle-${ref.oracleId}`
    : `name-${crypto.createHash('sha1').update(ref.name!.toLowerCase()).digest('hex')}`
  return `${base}_meta.json`
}

async function writeMeta(filePath: string, meta: CardMeta): Promise<CardMeta> {
  await fsp.mkdir(CARD_ART_DIR, { recursive: true })
  const tmp = `${filePath}.${process.pid}.tmp`
  await fsp.writeFile(tmp, JSON.stringify(meta))
  await fsp.rename(tmp, filePath)
  return meta
}

/**
 * Returns the illustrator of an MTG card, served from a local disk cache and
 * fetched from Scryfall on a miss. Resolves to `{ artist: null }` (and caches
 * that) when the card can't be found, so an unresolvable name isn't re-queried.
 */
export async function getCardMeta(ref: CardRef): Promise<CardMeta> {
  if (!ref.oracleId && !ref.name) throw Errors.badRequest('Card oracleId or name is required.')

  const key = metaCacheKey(ref)
  const filePath = path.join(CARD_ART_DIR, key)

  try {
    const cached = await fsp.readFile(filePath, 'utf8')
    return JSON.parse(cached) as CardMeta
  } catch {
    // Cache miss — fall through to fetch.
  }

  const existing = inFlightMeta.get(key)
  if (existing) return existing

  const task = fetchAndCacheMeta(ref, filePath).finally(() => inFlightMeta.delete(key))
  inFlightMeta.set(key, task)
  return task
}

async function fetchAndCacheMeta(ref: CardRef, filePath: string): Promise<CardMeta> {
  const url = ref.oracleId
    ? `https://api.scryfall.com/cards/search?q=oracleid%3A${encodeURIComponent(ref.oracleId)}&unique=cards`
    : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(ref.name!)}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    throw Errors.badRequest('Could not reach Scryfall.')
  }

  // Unknown / ambiguous card: cache a null artist so we don't re-query it.
  if (res.status === 404) return writeMeta(filePath, { artist: null })
  if (!res.ok) throw Errors.badRequest(`Scryfall returned ${res.status}.`)

  const json: unknown = await res.json()
  const card = ref.oracleId
    ? (SearchJsonSchema.safeParse(json).success
        ? SearchJsonSchema.parse(json).data[0]
        : undefined)
    : (CardJsonSchema.safeParse(json).success ? CardJsonSchema.parse(json) : undefined)

  const artist = card?.artist ?? card?.card_faces?.[0]?.artist ?? null
  return writeMeta(filePath, { artist })
}
