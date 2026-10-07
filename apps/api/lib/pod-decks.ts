import { Errors } from './errors.ts'

// Pure pod/deck access rules. Services fetch the rows and call these, so the
// decisions stay unit-testable without a database.

export type PodMemberRow = { id: string; userId: string | null; isPending: boolean }
export type PodDeckRow = {
  id: string
  ownerUserId: string
  name: string
  colorIdentity: string[] | null
  bracketEstimated: number
  bracketOverride: number | null
  isArchived: boolean
}
export type CommanderRow = { deckId: string; cardName: string }
export type DeckOwnerRow = { id: string; ownerUserId: string }
export type PodDeckItem = {
  id: string
  ownerMemberId: string
  name: string
  commander: string | null
  colorIdentity: string[]
  bracket: number
}

/** Accepted members with an account, keyed by userId → memberId. */
export function activeMemberIdByUserId(members: readonly PodMemberRow[]): Map<string, string> {
  const byUser = new Map<string, string>()
  for (const m of members) {
    if (m.userId && !m.isPending) byUser.set(m.userId, m.id)
  }
  return byUser
}

export function assertActivePodMember(members: readonly PodMemberRow[], userId: string): void {
  if (!activeMemberIdByUserId(members).has(userId)) {
    throw Errors.forbidden('You are not a member of this playgroup.')
  }
}

/** Non-archived decks of active members, with the owner's member id and commander. */
export function buildPodDecks(
  members: readonly PodMemberRow[],
  decks: readonly PodDeckRow[],
  commanders: readonly CommanderRow[],
): PodDeckItem[] {
  const memberIdByUser = activeMemberIdByUserId(members)
  const commanderByDeck = new Map<string, string>()
  for (const c of commanders) {
    if (!commanderByDeck.has(c.deckId)) commanderByDeck.set(c.deckId, c.cardName)
  }

  const items: PodDeckItem[] = []
  for (const d of decks) {
    const ownerMemberId = memberIdByUser.get(d.ownerUserId)
    if (d.isArchived || !ownerMemberId) continue
    items.push({
      id: d.id,
      ownerMemberId,
      name: d.name,
      commander: commanderByDeck.get(d.id) ?? null,
      colorIdentity: d.colorIdentity ?? [],
      bracket: d.bracketOverride ?? d.bracketEstimated,
    })
  }
  return items
}

/**
 * Every requested deck must exist and be owned by an active pod member.
 * Archive state is ignored: a deck archived mid-game must not lose the game.
 */
export function assertDecksInPod(
  deckIds: readonly string[],
  decks: readonly DeckOwnerRow[],
  members: readonly PodMemberRow[],
): void {
  const memberIdByUser = activeMemberIdByUserId(members)
  const ownerByDeck = new Map(decks.map((d) => [d.id, d.ownerUserId]))
  const outside = [...new Set(deckIds)].some((id) => {
    const owner = ownerByDeck.get(id)
    return !owner || !memberIdByUser.has(owner)
  })
  if (outside) throw Errors.badRequest('Every deck must belong to a member of this playgroup.')
}
