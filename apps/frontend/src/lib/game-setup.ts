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

export function toGsDeck(_d: PodDeckItem): GsDeck {
  throw new Error('not implemented')
}

export function deckChoicesForSeat(
  _decks: readonly GsDeck[],
  _members: readonly GsMember[],
  _seat: GsSeat | null,
): GsDeckChoices {
  throw new Error('not implemented')
}

export function isBorrowedDeck(_seat: GsSeat, _deck: GsDeck | undefined): boolean {
  throw new Error('not implemented')
}
