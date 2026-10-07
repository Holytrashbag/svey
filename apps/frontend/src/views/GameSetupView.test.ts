import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import { SESSION_KEY } from '@/lib/game-tracker'
import type { PlaygroupDetail, PlaygroupMemberDetail, PodDeckItem } from '@/types/api'
import GameSetupView from './GameSetupView.vue'
import GsSeatCard from '@/components/game-setup/GsSeatCard.vue'
import GsPlayerSheet from '@/components/game-setup/GsPlayerSheet.vue'
import GsDeckSheet from '@/components/game-setup/GsDeckSheet.vue'
import GsDeckOption from '@/components/game-setup/GsDeckOption.vue'

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

function member(over: Partial<PlaygroupMemberDetail>): PlaygroupMemberDetail {
  return {
    id: 'm', name: 'M', online: false, role: 'member', mainDeck: null,
    wins: 0, gamesPlayed: 0, winRate: null, threat: 0,
    you: false, avatarUrl: null, joinedAt: '2026-01-01T00:00:00.000Z', isOwner: false,
    ...over,
  }
}

const pod: PlaygroupDetail = {
  id: POD_ID, name: 'Tuesday', code: 'SPELL-ABCD-12', founded: '2026-01-01T00:00:00.000Z',
  totalGames: 0, thisMonth: 0, avgLength: 0,
  members: [
    member({ id: 'ana', name: 'Ana', you: true }),
    member({ id: 'ben', name: 'Ben' }),
    member({ id: 'cleo', name: 'Cleo' }),
  ],
  recent: [],
}

function podDeck(id: string, ownerMemberId: string, name: string): PodDeckItem {
  return { id, ownerMemberId, name, commander: null, colorIdentity: ['G'], bracket: 2 }
}

const podDecks: PodDeckItem[] = [
  podDeck('d-zada', 'ben', 'Zada'),
  podDeck('d-edgar', 'cleo', 'Edgar'),
  podDeck('d-atraxa', 'ana', 'Atraxa'),
  podDeck('d-krenko', 'ben', 'Krenko'),
]

function mockApi(decks: () => Promise<unknown>) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === `/playgroups/${POD_ID}`) return Promise.resolve(pod)
    if (path === `/playgroups/${POD_ID}/decks`) return decks()
    if (path === '/decks') return Promise.resolve({ decks: [] })
    return Promise.reject(new Error(`unexpected GET ${path}`))
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pods/:id/game', component: GameSetupView },
      { path: '/pods/:id/game/tracker', component: { template: '<div />' } },
    ],
  })
  await router.push(`/pods/${POD_ID}/game`)
  await router.isReady()
  const wrapper = mount(GameSetupView, {
    global: { plugins: [createPinia(), router, i18n] },
  })
  await flushPromises()
  return { wrapper, router }
}

async function seatPlayer(wrapper: VueWrapper, idx: number, memberId: string) {
  wrapper.findAllComponents(GsSeatCard)[idx]!.vm.$emit('pickPlayer')
  await flushPromises()
  wrapper.findComponent(GsPlayerSheet).vm.$emit('pick', memberId)
  await flushPromises()
}

async function seatGuest(wrapper: VueWrapper, idx: number, name: string) {
  wrapper.findAllComponents(GsSeatCard)[idx]!.vm.$emit('pickPlayer')
  await flushPromises()
  wrapper.findComponent(GsPlayerSheet).vm.$emit('addGuest', name)
  await flushPromises()
}

async function openDeckSheet(wrapper: VueWrapper, idx: number) {
  wrapper.findAllComponents(GsSeatCard)[idx]!.vm.$emit('pickDeck')
  await flushPromises()
}

async function pickDeck(wrapper: VueWrapper, idx: number, deckName: string) {
  await openDeckSheet(wrapper, idx)
  const option = wrapper.findAllComponents(GsDeckOption).find(o => o.props('deck').name === deckName)
  expect(option, `deck option ${deckName}`).toBeDefined()
  option!.vm.$emit('pick')
  await flushPromises()
}

beforeAll(() => setI18nLocale('en'))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(api.get).mockReset()
  mockApi(() => Promise.resolve({ decks: podDecks }))
})

describe('GameSetupView deck picker', () => {
  it("loads decks from the pod endpoint instead of the user's own deck list", async () => {
    await mountView()
    expect(api.get).toHaveBeenCalledWith(`/playgroups/${POD_ID}/decks`)
    expect(api.get).not.toHaveBeenCalledWith('/decks')
  })

  it("deck sheet shows the seat's own decks first, then other members' decks grouped by owner and marked borrowed", async () => {
    const { wrapper } = await mountView()
    // Only Ana is seated: Ben's and Cleo's decks must still be on offer.
    await seatPlayer(wrapper, 0, 'ana')
    await openDeckSheet(wrapper, 0)

    const options = wrapper.findAllComponents(GsDeckOption)
    expect(options.map(o => o.props('deck').name)).toEqual(['Atraxa', 'Krenko', 'Zada', 'Edgar'])
    expect(options.map(o => o.props('borrowed'))).toEqual([false, true, true, true])

    const text = wrapper.findComponent(GsDeckSheet).text()
    const order = ["Ana's decks", 'Borrow from the pod', "Ben's decks", "Cleo's decks"].map(s => text.indexOf(s))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("a guest seat can borrow a pod member's deck and the seat card shows it as borrowed", async () => {
    const { wrapper } = await mountView()
    await seatGuest(wrapper, 0, 'Gus')
    await openDeckSheet(wrapper, 0)

    const options = wrapper.findAllComponents(GsDeckOption)
    expect(options).toHaveLength(podDecks.length)
    expect(options.every(o => o.props('borrowed'))).toBe(true)
    expect(wrapper.findComponent(GsDeckSheet).text()).not.toContain("Gus's decks")

    await pickDeck(wrapper, 0, 'Krenko')
    const card = wrapper.findAllComponents(GsSeatCard)[0]!
    expect(card.text()).toContain('Krenko')
    expect(card.text()).toContain('Ben')
  })

  it('starting the game stores the borrowed deck in the session', async () => {
    const { wrapper, router } = await mountView()
    await seatPlayer(wrapper, 0, 'ana')
    await pickDeck(wrapper, 0, 'Zada')
    await seatPlayer(wrapper, 1, 'ben')
    await pickDeck(wrapper, 1, 'Krenko')

    const start = wrapper.findAll('button').find(b => b.text().includes('Start game'))
    expect(start, 'start button').toBeDefined()
    await start!.trigger('click')
    await flushPromises()

    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
    expect(session.seats[0]).toMatchObject({ playerId: 'ana', deckId: 'd-zada', deckName: 'Zada' })
    expect(session.seats[1]).toMatchObject({ playerId: 'ben', deckId: 'd-krenko', deckName: 'Krenko' })
    expect(router.currentRoute.value.path).toBe(`/pods/${POD_ID}/game/tracker`)
  })

  it('deck sheet shows a load error when the pod decks request fails', async () => {
    mockApi(() => Promise.reject(new Error('Server exploded')))
    const { wrapper } = await mountView()
    await seatPlayer(wrapper, 0, 'ana')
    await openDeckSheet(wrapper, 0)

    expect(wrapper.findComponent(GsDeckSheet).text()).toContain("Couldn't load the pod's decks")
  })
})
