import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { PlayerStats, PlayerDeckStat } from '@/types/api'

export type { PlayerStats, PlayerDeckStat } from '@/types/api'

export const useProfileStore = defineStore('profile', () => {
  const stats = ref<PlayerStats | null>(null)
  const statsLoading = ref(false)
  const statsError = ref<string | null>(null)

  const deckStats = ref<PlayerDeckStat[] | null>(null)
  const deckStatsLoading = ref(false)
  const deckStatsError = ref<string | null>(null)

  async function fetchStats() {
    statsLoading.value = true
    statsError.value = null
    try {
      stats.value = await api.get<PlayerStats>('/users/me/stats')
    } catch (e) {
      statsError.value = e instanceof Error ? e.message : 'Failed to load stats'
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchDeckStats() {
    deckStatsLoading.value = true
    deckStatsError.value = null
    try {
      const res = await api.get<{ deckStats: PlayerDeckStat[] }>('/users/me/deck-stats')
      deckStats.value = res.deckStats
    } catch (e) {
      deckStatsError.value = e instanceof Error ? e.message : 'Failed to load deck stats'
    } finally {
      deckStatsLoading.value = false
    }
  }

  return { stats, statsLoading, statsError, fetchStats, deckStats, deckStatsLoading, deckStatsError, fetchDeckStats }
})
