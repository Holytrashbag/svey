import { z } from 'zod'
import { Errors } from './errors.ts'

// ── Response schema ────────────────────────────────────────────────────────────

const ArchidektCardSchema = z.object({
  quantity: z.number().int(),
  categories: z.array(z.string()).nullable(),
  card: z.object({
    oracleCard: z.object({
      uid:           z.string().uuid(),
      name:          z.string(),
      colorIdentity: z.array(z.string()),
      salt:          z.number().nullable().optional(),
      superTypes:    z.array(z.string()).optional(),
      types:         z.array(z.string()).optional().default([]),
      manaCost:      z.string().optional().default(''),
      cmc:           z.number().optional().default(0),
    }),
  }),
})

const ArchidektDeckSchema = z.object({
  id:         z.number().int(),
  name:       z.string(),
  edhBracket: z.number().nullable().optional(),
  cards:      z.array(ArchidektCardSchema),
})

// ── Types ──────────────────────────────────────────────────────────────────────

export type ParsedCard = {
  name:        string
  scryfallId:  string
  isCommander: boolean
  quantity:    number
  cardType:    string
  manaCost:    string
  cmc:         number
  salt:        number
}

export type ParsedArchidektDeck = {
  archidektId:   string
  name:          string
  colorIdentity: string[]
  edhBracket:    number | null
  cards:         ParsedCard[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  White: 'W',
  Blue:  'U',
  Black: 'B',
  Red:   'R',
  Green: 'G',
}

function normalizeColor(raw: string): string {
  return COLOR_MAP[raw] ?? raw
}

export function parseArchidektUrl(url: string): string | null {
  const match = url.match(/archidekt\.com\/decks\/(\d+)/i)
  return match ? match[1] : null
}

// ── API client ─────────────────────────────────────────────────────────────────

export async function fetchArchidektDeck(archidektId: string): Promise<ParsedArchidektDeck> {
  let raw: unknown
  try {
    const res = await fetch(`https://archidekt.com/api/decks/${archidektId}/`, {
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) throw Errors.notFound(`Archidekt deck ${archidektId} not found`)
    if (!res.ok) throw new Error(`Archidekt returned ${res.status}`)
    raw = await res.json()
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) throw err
    throw Errors.badRequest('Could not reach Archidekt. Check the URL and try again.')
  }

  const parsed = ArchidektDeckSchema.safeParse(raw)
  if (!parsed.success) {
    throw Errors.badRequest('Unexpected response from Archidekt API.')
  }

  const data = parsed.data

  const cards: ParsedCard[] = data.cards.map(entry => ({
    name:        entry.card.oracleCard.name,
    scryfallId:  entry.card.oracleCard.uid,
    isCommander: Array.isArray(entry.categories) && entry.categories.includes('Commander'),
    quantity:    entry.quantity,
    cardType:    entry.card.oracleCard.types[0] ?? '',
    manaCost:    entry.card.oracleCard.manaCost,
    cmc:         entry.card.oracleCard.cmc,
    salt:        entry.card.oracleCard.salt ?? 0,
  }))

  // Derive color identity from commander card(s); fall back to any legendary creature
  const commanders = cards.filter(c => c.isCommander)
  const identitySource = commanders.length > 0
    ? data.cards.filter(e => Array.isArray(e.categories) && e.categories.includes('Commander'))
    : data.cards.filter(e =>
        Array.isArray(e.card.oracleCard.superTypes) &&
        e.card.oracleCard.superTypes.includes('Legendary')
      ).slice(0, 1)

  const colorSet = new Set<string>()
  for (const entry of identitySource) {
    for (const c of entry.card.oracleCard.colorIdentity) {
      const norm = normalizeColor(c)
      if (norm) colorSet.add(norm)
    }
  }

  const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G']
  const colorIdentity = COLOR_ORDER.filter(c => colorSet.has(c))

  return {
    archidektId:   String(data.id),
    name:          data.name,
    colorIdentity,
    edhBracket:    data.edhBracket ?? null,
    cards,
  }
}
