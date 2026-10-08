import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import type { DeckListItem } from '@/types/api'
import DecksView from './DecksView.vue'
import DeckRow from '@/components/decks/DeckRow.vue'

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

function item(name: string, wins: number, losses: number): DeckListItem {
  return {
    id: name, name, commander: null, colorIdentity: [], bracket: 3,
    isArchived: false, archidektId: null, lastSyncedAt: null, wins, losses,
  }
}

// Wins order: Many (3-1), Perfect (1-0), Idle (0-0). Win rate order: Perfect, Many, Idle.
const decks = [item('Idle', 0, 0), item('Perfect', 1, 0), item('Many', 3, 1)]

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/decks', component: DecksView }],
  })
  await router.push('/decks')
  await router.isReady()
  const wrapper = mount(DecksView, { global: { plugins: [createPinia(), router, i18n] } })
  await flushPromises()
  return wrapper
}

const names = (w: Awaited<ReturnType<typeof mountView>>) =>
  w.findAllComponents(DeckRow).map((r) => r.props('deck').name)

beforeAll(() => setI18nLocale('en'))

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.get).mockResolvedValue({ decks })
})

describe('DecksView sorting', () => {
  it('"Most wins" (default) lists decks by wins, descending', async () => {
    expect(names(await mountView())).toEqual(['Many', 'Perfect', 'Idle'])
  })

  it('"Best winrate" lists decks by win rate, decks without games last', async () => {
    const w = await mountView()
    await w.find('[data-sort-menu] button').trigger('click')
    const option = w.findAll('[data-sort-menu] button').find((b) => b.text().includes('Best winrate'))
    await option?.trigger('click')
    expect(names(w)).toEqual(['Perfect', 'Many', 'Idle'])
  })
})
