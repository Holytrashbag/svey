export type OrderablePod = { id: string; name: string; lastPlayed: string | null }

export function sortPodsByRecentActivity<T extends OrderablePod>(_pods: readonly T[]): T[] {
  throw new Error('not implemented')
}
