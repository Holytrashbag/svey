import { computed, type ComputedRef } from 'vue'
import type { PlaygroupDetail } from '@/types/api'

export function usePlaygroupStats(pg: ComputedRef<PlaygroupDetail | null>) {
  return computed(() => {
    const p = pg.value
    if (!p) return { wins: 0, winrate: null, threat: 0, streak: 0 }
    const me = p.members.find((m) => m.you)
    const wins = me?.wins ?? 0
    const winrate = me?.winRate ?? null
    const threat = Math.round((me?.threat ?? 0) * 10) / 10
    let streak = 0
    for (const g of p.recent) {
      if (g.winnerId === me?.id) streak++
      else break
    }
    return { wins, winrate, threat, streak }
  })
}
