import type { PlaygroupMemberDetail } from '@/types/api'

type StandingFields = Pick<PlaygroupMemberDetail, 'name' | 'wins' | 'gamesPlayed' | 'winRate'>

export function sortStandings<T extends StandingFields>(_members: readonly T[]): T[] {
  throw new Error('not implemented')
}

export function formatWinRate(_rate: number | null): string {
  throw new Error('not implemented')
}
