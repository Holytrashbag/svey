import { describe, it, expect } from 'vitest'
import { computed } from 'vue'
import { usePlaygroupStats } from './usePlaygroupStats'
import type { PlaygroupDetail, PlaygroupMemberDetail } from '@/types/api'

function member(over: Partial<PlaygroupMemberDetail>): PlaygroupMemberDetail {
  return {
    id: 'm', name: 'M', online: false, role: 'member', mainDeck: null,
    wins: 0, gamesPlayed: 0, winRate: null, threat: 0,
    you: false, avatarUrl: null, joinedAt: '2026-01-01T00:00:00.000Z', isOwner: false,
    ...over,
  }
}

function pod(members: PlaygroupMemberDetail[]): PlaygroupDetail {
  return {
    id: 'p', name: 'Pod', code: 'SPELL-ABCD-12', founded: '2026-01-01T00:00:00.000Z',
    totalGames: 10, thisMonth: 2, avgLength: 80, members, recent: [],
  }
}

describe('usePlaygroupStats', () => {
  it("winrate is the current member's win rate over games played", () => {
    const pg = computed<PlaygroupDetail | null>(() => pod([
      member({ id: 'me', you: true, wins: 3, gamesPlayed: 4, winRate: 75, threat: 7.5 }),
      member({ id: 'other', wins: 4, gamesPlayed: 10, winRate: 40, threat: 4 }),
    ]))
    expect(usePlaygroupStats(pg).value.winrate).toBe(75)
  })

  it('winrate is null when the current member has not played', () => {
    const pg = computed<PlaygroupDetail | null>(() => pod([
      member({ id: 'me', you: true }),
      member({ id: 'other', wins: 4, gamesPlayed: 10, winRate: 40, threat: 4 }),
    ]))
    expect(usePlaygroupStats(pg).value.winrate).toBeNull()
  })
})
