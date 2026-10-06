import type { PlaygroupMemberDetail } from '@/types/api'

type StandingFields = Pick<PlaygroupMemberDetail, 'name' | 'wins' | 'gamesPlayed' | 'winRate'>

/**
 * Pod standings order: win rate (members without games last), then wins,
 * then games played, then name. Returns a new array.
 */
export function sortStandings<T extends StandingFields>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => {
    if (a.winRate !== b.winRate) {
      if (a.winRate === null) return 1
      if (b.winRate === null) return -1
      return b.winRate - a.winRate
    }
    return b.wins - a.wins
      || b.gamesPlayed - a.gamesPlayed
      || a.name.localeCompare(b.name)
  })
}

/** "75%", or "—" when the member hasn't played yet. */
export function formatWinRate(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`
}
