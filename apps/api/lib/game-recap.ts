// Pure mapping for the game recap (GET /api/games/:id), kept free of the
// database so the note and retire rules can be unit-tested.

export type GameDetailPlayer = {
  name: string
  isGuest: boolean
  deck: { name: string; commander: string | null } | null
  finalLife: number
  isWinner: boolean
  deathCause: string
  deathAt: number | null
  /** The player's survey note, visible to every pod member; null when they left none. */
  note: string | null
}

export type RecapPlayerRow = {
  memberId: string | null
  guestName: string | null
  memberName: string | null
  deckId: string | null
  deckName: string | null
  finalLife: number
  isWinner: boolean
  deathCause: string | null
  diedAt: Date | null
  takeaway: string | null
}

export type RetireDetails = {
  abandonReasons: string[]
  abandonNotes: string | null
}

export function toNote(_text: string | null | undefined): string | null {
  throw new Error('not implemented')
}

export function parseAbandonReasons(_raw: unknown): string[] {
  throw new Error('not implemented')
}

export function retireDetails(_endReason: string | null, _rawReasons: unknown, _notes: string | null): RetireDetails {
  throw new Error('not implemented')
}

export function abandonNotesToStore(_endReason: string, _notes: string | undefined): string | null {
  throw new Error('not implemented')
}

export function buildRecapPlayers(
  _rows: readonly RecapPlayerRow[],
  _commanders: Record<string, string>,
  _startedAt: Date,
): GameDetailPlayer[] {
  throw new Error('not implemented')
}
