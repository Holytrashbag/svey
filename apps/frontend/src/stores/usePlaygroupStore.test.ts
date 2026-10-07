import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '@/lib/api'
import type { PodDeckItem } from '@/types/api'
import { usePlaygroupStore } from './usePlaygroupStore'

type Api = typeof api

vi.mock('@/lib/api', () => ({
  api: {
    get:    vi.fn<Api['get']>(),
    post:   vi.fn<Api['post']>(),
    patch:  vi.fn<Api['patch']>(),
    delete: vi.fn<Api['delete']>(),
    upload: vi.fn<Api['upload']>(),
  },
  apiUrl: (p: string) => p,
}))

const POD_ID = '11111111-1111-4111-8111-111111111111'

const krenko: PodDeckItem = {
  id: 'd-krenko', ownerMemberId: 'ben', name: 'Krenko', commander: 'Krenko, Mob Boss',
  colorIdentity: ['R'], bracket: 3,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(api.get).mockReset()
})

describe('usePlaygroupStore.fetchPodDecks', () => {
  it("loads the pod's decks into podDecks via GET /playgroups/:id/decks", async () => {
    vi.mocked(api.get).mockResolvedValue({ decks: [krenko] })
    const store = usePlaygroupStore()

    await store.fetchPodDecks(POD_ID)

    expect(api.get).toHaveBeenCalledWith(`/playgroups/${POD_ID}/decks`)
    expect(store.podDecks).toEqual([krenko])
    expect(store.podDecksError).toBeNull()
    expect(store.podDecksLoading).toBe(false)
  })

  it('clears podDecks and podDecksError as soon as it starts', async () => {
    const store = usePlaygroupStore()
    store.$patch({ podDecks: [krenko], podDecksError: 'old failure' })

    let resolve: (v: { decks: PodDeckItem[] }) => void = () => {}
    vi.mocked(api.get).mockReturnValue(new Promise(r => { resolve = r }))

    const pending = store.fetchPodDecks(POD_ID)
    expect(store.podDecks).toEqual([])
    expect(store.podDecksError).toBeNull()
    expect(store.podDecksLoading).toBe(true)

    resolve({ decks: [] })
    await pending
    expect(store.podDecksLoading).toBe(false)
  })

  it('records the error message and leaves podDecks empty on failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Server exploded'))
    const store = usePlaygroupStore()
    store.$patch({ podDecks: [krenko] })

    await store.fetchPodDecks(POD_ID)

    expect(store.podDecksError).toBe('Server exploded')
    expect(store.podDecks).toEqual([])
    expect(store.podDecksLoading).toBe(false)
  })
})
