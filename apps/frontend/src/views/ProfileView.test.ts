import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ref } from 'vue'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import type { PlayerStats } from '@/types/api'
import ProfileView from './ProfileView.vue'

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
  authClient: {
    useSession: () => ref({ data: { user: { name: 'Ana', email: 'ana@example.com', image: null, emailVerified: true, createdAt: '2026-01-01T00:00:00.000Z' } } }),
    sendVerificationEmail: vi.fn<() => void>(),
    signOut: vi.fn<() => void>(),
    updateUser: vi.fn<() => void>(),
    deleteUser: vi.fn<() => void>(),
  },
}))

function mockStats(stats: PlayerStats) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/users/me/stats') return Promise.resolve(stats)
    if (path === '/users/me/deck-stats') return Promise.resolve({ deckStats: [] })
    return Promise.reject(new Error(`unexpected GET ${path}`))
  })
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/profile', component: ProfileView }, { path: '/:rest(.*)', component: { template: '<div />' } }],
  })
  await router.push('/profile')
  await router.isReady()
  const wrapper = mount(ProfileView, { global: { plugins: [createPinia(), router, i18n] } })
  await flushPromises()
  return wrapper
}

beforeAll(() => setI18nLocale('en'))

beforeEach(() => {
  vi.mocked(api.get).mockReset()
})

describe('ProfileView win rate', () => {
  it('shows the win rate as a percentage', async () => {
    mockStats({ totalGames: 10, totalWins: 2, winRate: 20, avgPlacement: 2 })
    const wrapper = await mountView()
    const group = wrapper.findAll('[role="group"]').find((g) => g.attributes('aria-label') === 'Win Rate')
    expect(group, 'Win Rate group').toBeDefined()
    expect(group!.text()).toContain('20%')
  })

  it('shows "—" without a percent sign when the player has no finished games', async () => {
    mockStats({ totalGames: 0, totalWins: 0, winRate: null, avgPlacement: null })
    const wrapper = await mountView()
    const group = wrapper.findAll('[role="group"]').find((g) => g.attributes('aria-label') === 'Win Rate')
    expect(group, 'Win Rate group').toBeDefined()
    expect(group!.text()).toContain('—')
    expect(group!.text()).not.toContain('%')
  })
})
