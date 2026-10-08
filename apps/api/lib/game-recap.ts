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

/** A survey or retire note as shown on the recap: trimmed, or null when blank. */
export function toNote(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

/** `game.abandon_reasons` is jsonb; keep only the string ids. */
export function parseAbandonReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string')
}

/** Retire reasons and notes belong to retired games only. */
export function retireDetails(endReason: string | null, rawReasons: unknown, notes: string | null): RetireDetails {
  if (endReason !== 'abandoned') return { abandonReasons: [], abandonNotes: null }
  return { abandonReasons: parseAbandonReasons(rawReasons), abandonNotes: toNote(notes) }
}

/** The `game.abandon_notes` value to insert for a newly logged game. */
export function abandonNotesToStore(endReason: string, notes: string | undefined): string | null {
  return endReason === 'abandoned' ? toNote(notes) : null
}

export function buildRecapPlayers(
  rows: readonly RecapPlayerRow[],
  commanders: Record<string, string>,
  startedAt: Date,
): GameDetailPlayer[] {
  return rows.map((p) => {
    const isGuest = p.memberId == null
    const name = isGuest ? (p.guestName ?? 'Guest') : (p.memberName ?? 'Unknown')
    const deathAt = p.diedAt != null
      ? Math.round((p.diedAt.getTime() - startedAt.getTime()) / 1000)
      : null

    return {
      name,
      isGuest,
      deck: p.deckId != null
        ? { name: p.deckName ?? 'Unknown deck', commander: commanders[p.deckId] ?? null }
        : null,
      finalLife: p.finalLife,
      isWinner: p.isWinner,
      deathCause: p.deathCause ?? 'none',
      deathAt,
      note: toNote(p.takeaway),
    }
  })
}
