import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { GameDetail, CreateGameBody } from '@/types/api'

export type { GameDetail, GameDetailPlayer, CreateGameBody, CreateGamePlayer } from '@/types/api'

// ── Store ──────────────────────────────────────────────────────────────────────

export const useGameStore = defineStore('games', () => {
  const activeGame    = ref<GameDetail | null>(null)
  const detailLoading = ref(false)
  const detailError   = ref<string | null>(null)

  const createLoading = ref(false)
  const createError   = ref<string | null>(null)

  const deleteLoading = ref(false)
  const deleteError   = ref<string | null>(null)

  async function fetchGameDetail(id: string) {
    detailLoading.value = true
    detailError.value   = null
    try {
      activeGame.value = await api.get<GameDetail>(`/games/${id}`)
    } catch (e) {
      detailError.value = e instanceof Error ? e.message : 'Failed to load game'
    } finally {
      detailLoading.value = false
    }
  }

  async function createGame(body: CreateGameBody): Promise<string> {
    createLoading.value = true
    createError.value   = null
    try {
      const res = await api.post<{ id: string }>('/games', body)
      return res.id
    } catch (e) {
      createError.value = e instanceof Error ? e.message : 'Failed to save game'
      throw e
    } finally {
      createLoading.value = false
    }
  }

  async function deleteGame(id: string) {
    deleteLoading.value = true
    deleteError.value   = null
    try {
      await api.delete<void>(`/games/${id}`)
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : 'Failed to delete game'
      throw e
    } finally {
      deleteLoading.value = false
    }
  }

  return {
    activeGame, detailLoading, detailError,
    createLoading, createError,
    deleteLoading, deleteError,
    fetchGameDetail, createGame, deleteGame,
  }
})
