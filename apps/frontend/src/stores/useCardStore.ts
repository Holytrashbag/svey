import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'

export type CardRef = { oracleId?: string; name?: string }

function refKey(ref: CardRef): string {
  return ref.oracleId ? `o:${ref.oracleId}` : `n:${(ref.name ?? '').toLowerCase()}`
}

/**
 * Caches MTG card illustrators so we can credit them wherever the app renders
 * Scryfall art_crops (Scryfall requires the artist be identifiable). Artist is
 * immutable per card, so once fetched it's kept for the session.
 */
export const useCardStore = defineStore('cards', () => {
  // key -> artist name, or null once looked up with no artist. A missing key
  // means "not fetched yet".
  const artists = ref<Record<string, string | null>>({})

  async function fetchArtist(ref: CardRef): Promise<void> {
    if (!ref.oracleId && !ref.name) return
    const key = refKey(ref)
    if (key in artists.value) return
    // Reserve synchronously so concurrent callers don't double-fetch.
    artists.value[key] = null
    try {
      const q = ref.oracleId
        ? `oracleId=${encodeURIComponent(ref.oracleId)}`
        : `name=${encodeURIComponent(ref.name!)}`
      const res = await api.get<{ artist: string | null }>(`/cards/meta?${q}`)
      artists.value[key] = res.artist
    } catch {
      // Leave the reserved null; attribution just won't show for this card.
    }
  }

  function artistFor(ref: CardRef): string | null {
    return artists.value[refKey(ref)] ?? null
  }

  return { artists, fetchArtist, artistFor }
})
