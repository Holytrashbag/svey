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

export function assertActivePodMember(_members: readonly PodMemberRow[], _userId: string): void {
  throw new Error('not implemented')
}

export function activeMemberIdByUserId(_members: readonly PodMemberRow[]): Map<string, string> {
  throw new Error('not implemented')
}

export function buildPodDecks(
  _members: readonly PodMemberRow[],
  _decks: readonly PodDeckRow[],
  _commanders: readonly CommanderRow[],
): PodDeckItem[] {
  throw new Error('not implemented')
}

export function assertDecksInPod(
  _deckIds: readonly string[],
  _decks: readonly DeckOwnerRow[],
  _members: readonly PodMemberRow[],
): void {
  throw new Error('not implemented')
}
