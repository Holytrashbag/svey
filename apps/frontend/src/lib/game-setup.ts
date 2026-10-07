import type { PodDeckItem } from '@/types/api'

export type GsSeat = {
  playerId: string | null
  isGuest: boolean
  guestName: string
  deckId: string | null
}

export type GsMember = {
  id: string
  name: string
  you?: boolean
}

export type GsPod = {
  id: string
  name: string
  members: GsMember[]
}

export type GsDeck = {
  id: string
  owner: string
  name: string
  commander?: string
  colors: string[]
  bracket: number
  archetype?: string
}

export type GsDeckGroup = {
  owner: GsMember
  decks: GsDeck[]
}

export type GsDeckChoices = {
  own:      GsDeck[]
  borrowed: GsDeckGroup[]
}

export function toGsDeck(d: PodDeckItem): GsDeck {
  return {
    id:        d.id,
    owner:     d.ownerMemberId,
    name:      d.name,
    commander: d.commander ?? undefined,
    colors:    d.colorIdentity,
    bracket:   d.bracket,
  }
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

/**
 * Deck choices for one seat: the pilot's own decks first, then every other
 * pod member's decks grouped by owner. Guests own nothing, so all their
 * decks are borrowed. Decks whose owner isn't in the pod are dropped.
 */
export function deckChoicesForSeat(
  decks: readonly GsDeck[],
  members: readonly GsMember[],
  seat: GsSeat | null,
): GsDeckChoices {
  const pilotId = seat && !seat.isGuest ? seat.playerId : null
  const own = decks.filter(d => d.owner === pilotId).sort(byName)
  const borrowed = members
    .filter(m => m.id !== pilotId)
    .map(owner => ({ owner, decks: decks.filter(d => d.owner === owner.id).sort(byName) }))
    .filter(g => g.decks.length > 0)
    .sort((a, b) => byName(a.owner, b.owner))
  return { own: pilotId && members.some(m => m.id === pilotId) ? own : [], borrowed }
}

export function isBorrowedDeck(seat: GsSeat, deck: GsDeck | undefined): boolean {
  return !!deck && (seat.isGuest || deck.owner !== seat.playerId)
}
