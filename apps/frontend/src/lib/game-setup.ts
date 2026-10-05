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
