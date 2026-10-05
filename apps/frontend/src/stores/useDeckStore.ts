import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { DeckListItem, DeckDetail, DeckStats } from '@/types/api'

export type { DeckListItem, DeckDetail, DeckStats }
export type { DeckCard, DeckMatchupStat, DeckStatScope } from '@/types/api'

export type UpdateDeckData = {
  name?:            string
  bracketOverride?: number | null
  isArchived?:      boolean
}

export const useDeckStore = defineStore('decks', () => {
  const decks = ref<DeckListItem[] | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const importLoading = ref(false)
  const importError = ref<string | null>(null)
  const activeDeck = ref<DeckDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)
  const syncLoading = ref(false)
  const syncError = ref<string | null>(null)
  const deckStats = ref<DeckStats | null>(null)
  const statsLoading = ref(false)
  const statsError = ref<string | null>(null)

  async function fetchDecks() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ decks: DeckListItem[] }>('/decks')
      decks.value = res.decks
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load decks'
    } finally {
      loading.value = false
    }
  }

  async function importDeck(url: string): Promise<string> {
    importLoading.value = true
    importError.value = null
    try {
      const res = await api.post<{ id: string }>('/decks/import', { url })
      await fetchDecks()
      return res.id
    } catch (e) {
      importError.value = e instanceof Error ? e.message : 'Import failed'
      throw e
    } finally {
      importLoading.value = false
    }
  }

  async function updateDeck(id: string, data: UpdateDeckData) {
    try {
      await api.patch<{ id: string }>(`/decks/${id}`, data)
      if (decks.value) {
        const idx = decks.value.findIndex(d => d.id === id)
        if (idx !== -1) {
          const deck = decks.value[idx]!
          decks.value[idx] = {
            ...deck,
            ...(data.name !== undefined && { name: data.name }),
            ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
          }
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Update failed'
      throw e
    }
  }

  async function syncDeck(id: string) {
    syncLoading.value = true
    syncError.value = null
    try {
      activeDeck.value = await api.post<DeckDetail>(`/decks/${id}/sync`, {})
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : 'Sync failed'
      throw e
    } finally {
      syncLoading.value = false
    }
  }

  async function fetchDeckDetail(id: string) {
    detailLoading.value = true
    detailError.value = null
    try {
      activeDeck.value = await api.get<DeckDetail>(`/decks/${id}`)
    } catch (e) {
      detailError.value = e instanceof Error ? e.message : 'Failed to load deck'
    } finally {
      detailLoading.value = false
    }
  }

  async function fetchDeckStats(id: string) {
    statsLoading.value = true
    statsError.value = null
    try {
      deckStats.value = await api.get<DeckStats>(`/decks/${id}/stats`)
    } catch (e) {
      statsError.value = e instanceof Error ? e.message : 'Failed to load stats'
    } finally {
      statsLoading.value = false
    }
  }

  return {
    decks, loading, error,
    importLoading, importError,
    activeDeck, detailLoading, detailError,
    syncLoading, syncError,
    deckStats, statsLoading, statsError,
    fetchDecks, importDeck, updateDeck, fetchDeckDetail, syncDeck, fetchDeckStats,
  }
})
