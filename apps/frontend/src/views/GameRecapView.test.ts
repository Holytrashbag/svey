import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import type { GameDetail, GameDetailPlayer } from '@/types/api'
import GameRecapView from './GameRecapView.vue'

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

const GAME_ID = '33333333-3333-4333-8333-333333333333'

function player(over: Partial<GameDetailPlayer>): GameDetailPlayer {
  return {
    name: 'P', isGuest: false, deck: null, finalLife: 0, isWinner: false,
    deathCause: 'life', deathAt: 600, note: null,
    ...over,
  }
}

function detail(over: Partial<GameDetail> = {}): GameDetail {
  return {
    id: GAME_ID,
    playgroup: { id: 'pod', name: 'Tuesday' },
    playedAt: '2026-10-01T19:00:00.000Z',
    durationSec: 3600,
    endReason: 'won',
    players: [
      player({ name: 'Alex', isWinner: true, finalLife: 39, deathCause: 'none', deathAt: null, note: 'Atraxa did Atraxa things.' }),
      player({ name: 'Jordan', deathCause: 'conceded', deathAt: 900 }),
      player({ name: 'Morgan', isGuest: true, deathCause: 'special', deathAt: 300, note: 'Goblins forever.' }),
    ],
    survey: { avgFun: 4, avgAgency: 5, responseCount: 2 },
    abandonReasons: [],
    abandonNotes: null,
    ...over,
  }
}

async function mountView(game: GameDetail) {
  vi.mocked(api.get).mockResolvedValue(game)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/games/:id', component: GameRecapView }],
  })
  await router.push(`/games/${GAME_ID}`)
  await router.isReady()
  const wrapper = mount(GameRecapView, {
    global: { plugins: [createPinia(), router, i18n] },
  })
  await flushPromises()
  return wrapper
}

function playerRow(wrapper: VueWrapper, name: string) {
  const row = wrapper.get('ul[aria-label="Players"]').findAll('li').find(li => li.text().includes(name))
  if (!row) throw new Error(`no recap row for ${name}`)
  return row
}

// The <section> whose aria-labelledby heading reads `name`.
function region(wrapper: VueWrapper, name: string) {
  return wrapper.findAll('section[aria-labelledby]').find((s) => {
    const id = s.attributes('aria-labelledby')
    return wrapper.find(`[id="${id}"]`).text() === name
  })
}

beforeAll(() => setI18nLocale('en'))

beforeEach(() => {
  vi.mocked(api.get).mockReset()
})

describe('GameRecapView notes', () => {
  it("shows each player's survey note next to their result", async () => {
    const wrapper = await mountView(detail())
    expect(api.get).toHaveBeenCalledWith(`/games/${GAME_ID}`)

    const alex = playerRow(wrapper, 'Alex')
    expect(alex.text()).toContain('39 life')
    expect(alex.get('blockquote').text()).toBe('Atraxa did Atraxa things.')
  })

  it('shows no note box for players without a note', async () => {
    const wrapper = await mountView(detail())
    const jordan = playerRow(wrapper, 'Jordan')
    expect(jordan.text()).toContain('Conceded')
    expect(jordan.find('blockquote').exists()).toBe(false)
  })

  it("shows a guest's note under the guest name", async () => {
    const wrapper = await mountView(detail())
    expect(playerRow(wrapper, 'Morgan').get('blockquote').text()).toBe('Goblins forever.')
  })

  it('renders notes as plain text', async () => {
    const html = '<img src=x onerror="alert(1)"><b>bold</b>'
    const wrapper = await mountView(detail({
      players: [player({ name: 'Alex', isWinner: true, deathCause: 'none', deathAt: null, note: html })],
    }))

    const note = playerRow(wrapper, 'Alex').get('blockquote')
    expect(note.text()).toBe(html)
    expect(note.find('img').exists()).toBe(false)
    expect(note.find('b').exists()).toBe(false)
  })
})

describe('GameRecapView retire details', () => {
  it('shows retire reasons and notes for retired games', async () => {
    const wrapper = await mountView(detail({
      endReason: 'abandoned',
      abandonReasons: ['time', 'other'],
      abandonNotes: 'Venue closed early.',
    }))

    const card = region(wrapper, 'Why it was retired')
    expect(card).toBeDefined()
    expect(card!.text()).toContain('Out of time')
    expect(card!.text()).toContain('Other')
    expect(card!.get('blockquote').text()).toBe('Venue closed early.')
  })

  it('shows reasons without a notes box when a retired game has no notes', async () => {
    const wrapper = await mountView(detail({ endReason: 'abandoned', abandonReasons: ['stall'], abandonNotes: null }))

    const card = region(wrapper, 'Why it was retired')
    expect(card).toBeDefined()
    expect(card!.text()).toContain('Long stall')
    expect(card!.find('blockquote').exists()).toBe(false)
  })

  it('shows no retire section for won games', async () => {
    const wrapper = await mountView(detail())
    expect(region(wrapper, 'Why it was retired')).toBeUndefined()
  })
})
