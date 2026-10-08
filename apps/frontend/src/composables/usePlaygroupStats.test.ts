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

function game(winnerId: string | null) {
  return { id: `g-${Math.random()}`, winnerId, deck: 'Deck', when: '2026-01-01T00:00:00.000Z' }
}

describe('usePlaygroupStats', () => {
  it("wins come from the current member's pod record", () => {
    const pg = computed<PlaygroupDetail | null>(() => pod([
      member({ id: 'me', you: true, wins: 3, gamesPlayed: 4, winRate: 75, threat: 7.5 }),
      member({ id: 'other', wins: 4, gamesPlayed: 10, winRate: 40, threat: 4 }),
    ]))
    const stats = usePlaygroupStats(pg).value
    expect(stats.wins).toBe(3)
    expect(stats.threat).toBe(7.5)
    expect(stats).not.toHaveProperty('winrate')
  })

  it('streak counts consecutive recent pod wins and stops at the first game someone else won', () => {
    const pg = computed<PlaygroupDetail | null>(() => ({
      ...pod([member({ id: 'me', you: true }), member({ id: 'other' })]),
      recent: [game('me'), game('me'), game('other'), game('me')],
    }))
    expect(usePlaygroupStats(pg).value.streak).toBe(2)
  })
})
