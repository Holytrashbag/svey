import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import type { PlaygroupDetail, PlaygroupMemberDetail } from '@/types/api'
import PlaygroupDetailView from './PlaygroupDetailView.vue'
import PlaygroupStandingRow from '@/components/playgroups/PlaygroupStandingRow.vue'
import PlaygroupMemberCard from '@/components/playgroups/PlaygroupMemberCard.vue'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn() },
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

// Pod with 10 finished games. Ana joined late: 3 wins in the 4 games she played.
const fixture: PlaygroupDetail = {
  id: POD_ID, name: 'Tuesday', code: 'SPELL-ABCD-12', founded: '2026-01-01T00:00:00.000Z',
  totalGames: 10, thisMonth: 4, avgLength: 85,
  members: [
    member({ id: 'ben',  name: 'Ben',  mainDeck: 'Krenko', wins: 4, gamesPlayed: 10, winRate: 40, threat: 4 }),
    member({ id: 'cleo', name: 'Cleo', mainDeck: 'Edgar', wins: 0, gamesPlayed: 0,  winRate: null, threat: 0 }),
    member({ id: 'ana',  name: 'Ana',  mainDeck: 'Atraxa', wins: 3, gamesPlayed: 4,  winRate: 75, threat: 7.5, you: true }),
  ],
  recent: [],
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/pods/:id', component: PlaygroupDetailView }],
  })
  await router.push(`/pods/${POD_ID}`)
  await router.isReady()
  const wrapper = mount(PlaygroupDetailView, {
    global: { plugins: [createPinia(), router, i18n] },
  })
  await flushPromises()
  return wrapper
}

beforeAll(() => setI18nLocale('en'))

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.get).mockResolvedValue(fixture)
})

describe('PlaygroupDetailView', () => {
  it('standings rank members by win rate over games played', async () => {
    const wrapper = await mountView()
    expect(api.get).toHaveBeenCalledWith(`/playgroups/${POD_ID}`)

    const rows = wrapper.findAllComponents(PlaygroupStandingRow)
    expect(rows.map(r => r.props('name'))).toEqual(['Ana', 'Ben', 'Cleo'])
    expect(rows[0]!.text()).toContain('75%')
    expect(rows[1]!.text()).toContain('40%')
    expect(rows[2]!.text()).toContain('—')
    expect(rows[2]!.text()).not.toContain('%')
  })

  it('members tab shows the same win rate and threat per member', async () => {
    const wrapper = await mountView()
    const membersTab = wrapper.findAll('button').find(b => b.text() === 'Members')
    expect(membersTab).toBeDefined()
    await membersTab!.trigger('click')

    const cards = wrapper.findAllComponents(PlaygroupMemberCard)
    const byName = (name: string) => cards.find(c => c.props('name') === name)
    expect(byName('Ana')!.text()).toContain('75%')
    expect(byName('Ana')!.text()).toContain('7.5')
    expect(byName('Ben')!.text()).toContain('40%')
    expect(byName('Cleo')!.text()).toContain('—')
    expect(byName('Cleo')!.text()).not.toContain('%')
  })
})
