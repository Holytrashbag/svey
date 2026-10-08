export type OrderablePod = { id: string; name: string; lastPlayed: string | null }

/**
 * Order of a user's active pods: most recently played first, then pods without
 * games by name (case-insensitive). Id breaks any remaining tie, so the order
 * never depends on the row order the database happens to return.
 */
export function sortPodsByRecentActivity<T extends OrderablePod>(pods: readonly T[]): T[] {
  const playedAt = (p: OrderablePod) => (p.lastPlayed === null ? null : Date.parse(p.lastPlayed))
  return [...pods].sort((a, b) => {
    const at = playedAt(a)
    const bt = playedAt(b)
    if (at !== bt) {
      if (at === null) return 1
      if (bt === null) return -1
      return bt - at
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  })
}
