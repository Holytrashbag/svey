import { computed, type ComputedRef } from 'vue'
import type { PlaygroupDetail } from '@/types/api'

export function usePlaygroupStats(pg: ComputedRef<PlaygroupDetail | null>) {
  return computed(() => {
    const p = pg.value
    if (!p) return { wins: 0, winrate: 0, threat: 0, streak: 0 }
    const me = p.members.find((m) => m.you)
    const wins = me?.wins ?? 0
    const winrate = p.totalGames > 0 ? Math.round((wins / p.totalGames) * 100) : 0
    const threat = Math.round((me?.threat ?? 0) * 10) / 10
    let streak = 0
    for (const g of p.recent) {
      if (g.winnerId === me?.id) streak++
      else break
    }
    return { wins, winrate, threat, streak }
  })
}
