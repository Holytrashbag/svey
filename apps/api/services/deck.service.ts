import { eq, and, inArray } from 'drizzle-orm'
import type { Db } from '../lib/db.ts'
import { deck, decklistCard } from '../db/schema.ts'
import { Errors } from '../lib/errors.ts'
import { parseArchidektUrl, fetchArchidektDeck } from '../lib/archidekt.ts'
import { estimateBracket } from '../lib/bracket-estimator.ts'
import * as notificationService from './notification.service.ts'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DeckListItem = {
  id:            string
  name:          string
  commander:     string | null
  colorIdentity: string[]
  bracket:       number
  isArchived:    boolean
  archidektId:   string | null
  lastSyncedAt:  string | null
  wins:          number
  losses:        number
}

export type DeckCard = {
  name:        string
  scryfallId:  string
  isCommander: boolean
  quantity:    number
  cardType:    string
  manaCost:    string
  cmc:         number
  saltScore:   number
}

export type DeckDetail = {
  id:               string
  name:             string
  commander:        string | null
  colorIdentity:    string[]
  bracket:          number
  bracketEstimated: number
  bracketOverride:  number | null
  isArchived:       boolean
  archidektId:      string | null
  archidektDeleted: boolean
  lastSyncedAt:     string | null
  createdAt:        string
  saltSum:          number
  cards:            DeckCard[]
}

export type UpdateDeckData = {
  name?:           string
  bracketOverride?: number | null
  isArchived?:     boolean
}

// ── importDeck ─────────────────────────────────────────────────────────────────

export async function importDeck(dbClient: Db, userId: string, url: string): Promise<string> {
  const archidektId = parseArchidektUrl(url)
  if (!archidektId) throw Errors.badRequest('URL does not look like an Archidekt deck link.')

  const existing = await dbClient
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.ownerUserId, userId), eq(deck.archidektId, archidektId)))
    .limit(1)

  if (existing.length > 0) throw Errors.conflict('You have already imported this deck.')

  const parsed = await fetchArchidektDeck(archidektId)

  const bracketEstimated = parsed.edhBracket ?? estimateBracket(parsed.cards.map(c => c.salt))

  let newDeckId = ''

  await dbClient.transaction(async (tx) => {
    const [created] = await tx
      .insert(deck)
      .values({
        ownerUserId:      userId,
        name:             parsed.name,
        archidektId:      parsed.archidektId,
        bracketEstimated,
        colorIdentity:    parsed.colorIdentity,
        lastSyncedAt:     new Date(),
      })
      .returning({ id: deck.id })

    if (!created) throw new Error('Failed to insert deck')
    newDeckId = created.id

    if (parsed.cards.length > 0) {
      await tx.insert(decklistCard).values(
        parsed.cards.map(c => ({
          deckId:      newDeckId,
          cardName:    c.name,
          scryfallId:  c.scryfallId,
          isCommander: c.isCommander,
          quantity:    c.quantity,
          cardType:    c.cardType,
          manaCost:    c.manaCost,
          cmc:         c.cmc,
          saltScore:   c.salt,
        }))
      )
    }
  })

  return newDeckId
}

// ── listDecks ──────────────────────────────────────────────────────────────────

export async function listDecks(dbClient: Db, userId: string): Promise<DeckListItem[]> {
  const decks = await dbClient
    .select({
      id:               deck.id,
      name:             deck.name,
      colorIdentity:    deck.colorIdentity,
      bracketEstimated: deck.bracketEstimated,
      bracketOverride:  deck.bracketOverride,
      isArchived:       deck.isArchived,
      archidektId:      deck.archidektId,
      lastSyncedAt:     deck.lastSyncedAt,
    })
    .from(deck)
    .where(eq(deck.ownerUserId, userId))

  if (decks.length === 0) return []

  const deckIds = decks.map(d => d.id)
  const commanders = await dbClient
    .select({ deckId: decklistCard.deckId, cardName: decklistCard.cardName })
    .from(decklistCard)
    .where(and(eq(decklistCard.isCommander, true), inArray(decklistCard.deckId, deckIds)))

  const commanderMap: Record<string, string> = {}
  for (const row of commanders) {
    commanderMap[row.deckId] = row.cardName
  }

  return decks.map(d => ({
    id:            d.id,
    name:          d.name,
    commander:     commanderMap[d.id] ?? null,
    colorIdentity: d.colorIdentity ?? [],
    bracket:       d.bracketOverride ?? d.bracketEstimated,
    isArchived:    d.isArchived,
    archidektId:   d.archidektId,
    lastSyncedAt:  d.lastSyncedAt?.toISOString() ?? null,
    wins:          0,
    losses:        0,
  }))
}

// ── getDeckDetail ──────────────────────────────────────────────────────────────

export async function getDeckDetail(dbClient: Db, userId: string, deckId: string): Promise<DeckDetail> {
  const rows = await dbClient
    .select()
    .from(deck)
    .where(eq(deck.id, deckId))
    .limit(1)

  const row = rows[0]
  if (!row) throw Errors.notFound('Deck not found')
  if (row.ownerUserId !== userId) throw Errors.forbidden('You do not own this deck')

  const cards = await dbClient
    .select({
      name:        decklistCard.cardName,
      scryfallId:  decklistCard.scryfallId,
      isCommander: decklistCard.isCommander,
      quantity:    decklistCard.quantity,
      cardType:    decklistCard.cardType,
      manaCost:    decklistCard.manaCost,
      cmc:         decklistCard.cmc,
      saltScore:   decklistCard.saltScore,
    })
    .from(decklistCard)
    .where(eq(decklistCard.deckId, deckId))

  const commander = cards.find(c => c.isCommander)?.name ?? null
  const saltSum = cards.reduce((s, c) => s + c.saltScore, 0)

  return {
    id:               row.id,
    name:             row.name,
    commander,
    colorIdentity:    row.colorIdentity ?? [],
    bracket:          row.bracketOverride ?? row.bracketEstimated,
    bracketEstimated: row.bracketEstimated,
    bracketOverride:  row.bracketOverride,
    isArchived:       row.isArchived,
    archidektId:      row.archidektId,
    archidektDeleted: row.archidektDeleted,
    lastSyncedAt:     row.lastSyncedAt?.toISOString() ?? null,
    createdAt:        row.createdAt.toISOString(),
    saltSum,
    cards,
  }
}

// ── syncDeck ───────────────────────────────────────────────────────────────────

export async function syncDeck(dbClient: Db, userId: string, deckId: string): Promise<DeckDetail> {
  const rows = await dbClient
    .select()
    .from(deck)
    .where(eq(deck.id, deckId))
    .limit(1)

  const row = rows[0]
  if (!row) throw Errors.notFound('Deck not found')
  if (row.ownerUserId !== userId) throw Errors.forbidden('You do not own this deck')
  if (!row.archidektId) throw Errors.badRequest('This deck has no Archidekt ID to sync from.')

  let parsed: Awaited<ReturnType<typeof fetchArchidektDeck>>
  try {
    parsed = await fetchArchidektDeck(row.archidektId)
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
      await dbClient.update(deck).set({ archidektDeleted: true }).where(eq(deck.id, deckId))
      try {
        await notificationService.createNotification(dbClient, row.ownerUserId, {
          type:  'deck_archidekt_deleted',
          title: `${row.name} was deleted on Archidekt`,
          body:  'It is still here, but will no longer sync.',
          params: { deck: row.name },
          deckId,
        })
      } catch (notifyErr) {
        console.error('Failed to emit deck_archidekt_deleted notification', notifyErr)
      }
      throw Errors.notFound('Deck no longer exists on Archidekt.')
    }
    throw err
  }

  const bracketEstimated = parsed.edhBracket ?? estimateBracket(parsed.cards.map(c => c.salt))

  await dbClient.transaction(async (tx) => {
    await tx.update(deck).set({
      name:             parsed.name,
      colorIdentity:    parsed.colorIdentity,
      bracketEstimated,
      archidektDeleted: false,
      lastSyncedAt:     new Date(),
    }).where(eq(deck.id, deckId))

    await tx.delete(decklistCard).where(eq(decklistCard.deckId, deckId))

    if (parsed.cards.length > 0) {
      await tx.insert(decklistCard).values(
        parsed.cards.map(c => ({
          deckId:      deckId,
          cardName:    c.name,
          scryfallId:  c.scryfallId,
          isCommander: c.isCommander,
          quantity:    c.quantity,
          cardType:    c.cardType,
          manaCost:    c.manaCost,
          cmc:         c.cmc,
          saltScore:   c.salt,
        }))
      )
    }
  })

  return getDeckDetail(dbClient, userId, deckId)
}

// ── updateDeck ─────────────────────────────────────────────────────────────────

export async function updateDeck(
  dbClient: Db,
  userId: string,
  deckId: string,
  data: UpdateDeckData,
): Promise<void> {
  const rows = await dbClient
    .select({ ownerUserId: deck.ownerUserId })
    .from(deck)
    .where(eq(deck.id, deckId))
    .limit(1)

  const row = rows[0]
  if (!row) throw Errors.notFound('Deck not found')
  if (row.ownerUserId !== userId) throw Errors.forbidden('You do not own this deck')

  const updates: Partial<typeof data & { bracketOverride: number | null }> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.bracketOverride !== undefined) updates.bracketOverride = data.bracketOverride
  if (data.isArchived !== undefined) updates.isArchived = data.isArchived

  if (Object.keys(updates).length === 0) return

  await dbClient
    .update(deck)
    .set(updates)
    .where(eq(deck.id, deckId))
}
