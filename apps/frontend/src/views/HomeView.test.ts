import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ref } from 'vue'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import type { ActivePlaygroupItem, PlaygroupDetail, PlaygroupMemberDetail, PlayerStats } from '@/types/api'
import HomeView from './HomeView.vue'

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

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ref({ data: { user: { name: 'Ana', image: null } } }) },
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

const activePod: ActivePlaygroupItem = {
  id: POD_ID, name: 'Tuesday', members: [], lastPlayed: null, record: { wins: 0, losses: 0 },
}

function detail(over: Partial<PlaygroupDetail> = {}): PlaygroupDetail {
  return {
    id: POD_ID, name: 'Tuesday', code: 'SPELL-ABCD-12', founded: '2026-01-01T00:00:00.000Z',
    totalGames: 4, thisMonth: 1, avgLength: 60,
    members: [member({ id: 'me', name: 'Ana', you: true, wins: 3, gamesPlayed: 4, winRate: 75, threat: 7.5 })],
    recent: [],
    ...over,
  }
}

function mockApi(stats: () => Promise<PlayerStats>, pod: PlaygroupDetail = detail()) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/playgroups') return Promise.resolve({ active: [activePod], pending: [] })
    if (path === `/playgroups/${POD_ID}`) return Promise.resolve(pod)
    if (path === '/notifications') return Promise.resolve({ notifications: [], unreadCount: 0 })
    if (path === '/users/me/stats') return stats()
    return Promise.reject(new Error(`unexpected GET ${path}`))
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/home', component: HomeView }, { path: '/:rest(.*)', component: { template: '<div />' } }],
  })
  await router.push('/home')
  await router.isReady()
  const wrapper = mount(HomeView, { global: { plugins: [createPinia(), router, i18n] } })
  await flushPromises()
  return wrapper
}

function winRateGroup(wrapper: Awaited<ReturnType<typeof mountView>>) {
  const group = wrapper.findAll('[role="group"]').find((g) => g.text().includes('All pods'))
  expect(group, 'win rate group').toBeDefined()
  return group!
}

beforeAll(() => setI18nLocale('en'))

beforeEach(() => {
  vi.mocked(api.get).mockReset()
})

describe('HomeView win rate', () => {
  it('shows the personal all-pods rate from /users/me/stats, not the pod rate', async () => {
    mockApi(() => Promise.resolve({ totalGames: 10, totalWins: 2, winRate: 20, avgPlacement: 2 }))
    const wrapper = await mountView()
    const group = winRateGroup(wrapper)
    expect(group.text()).toContain('20%')
    expect(wrapper.text()).not.toContain('75%')
  })

  it('shows "—" when the user has no finished games', async () => {
    mockApi(() => Promise.resolve({ totalGames: 0, totalWins: 0, winRate: null, avgPlacement: null }))
    const wrapper = await mountView()
    const group = winRateGroup(wrapper)
    expect(group.text()).toContain('—')
    expect(group.text()).not.toContain('%')
  })

  it('shows "—" when the stats request fails', async () => {
    mockApi(() => Promise.reject(new Error('boom')))
    const wrapper = await mountView()
    const group = winRateGroup(wrapper)
    expect(group.text()).toContain('—')
    expect(group.text()).not.toContain('NaN')
  })

  it('wins and streak still come from the selected pod', async () => {
    const games = [1, 2, 3].map((i) => ({
      id: `g${i}`, winnerId: i === 3 ? 'other' : 'me', deck: 'Deck', when: '2026-01-01T00:00:00.000Z',
    }))
    mockApi(
      () => Promise.resolve({ totalGames: 10, totalWins: 2, winRate: 20, avgPlacement: 2 }),
      detail({ recent: games }),
    )
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('2-game win streak')
    const wins = wrapper.findAll('.text-crown').find((e) => e.text() === '3')
    expect(wins, 'wins card shows 3').toBeDefined()
  })
})
