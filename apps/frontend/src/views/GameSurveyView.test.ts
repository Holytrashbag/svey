import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n, { setI18nLocale } from '@/i18n'
import { api } from '@/lib/api'
import { RESULT_KEY, SESSION_KEY } from '@/lib/game-tracker'
import type { GameResultData, GameSessionData, GameSessionSeat, GtPlayer } from '@/lib/game-tracker'
import type { CreateGameBody } from '@/types/api'
import GameSurveyView from './GameSurveyView.vue'

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
const Stub = { template: '<div />' }

function gtPlayer(seatIdx: number, name: string): GtPlayer {
  return {
    seatIdx, name, isYou: seatIdx === 0, isGuest: false,
    deck: { id: `deck-${seatIdx}`, colors: ['G'], commander: 'Cmdr' },
    life: 40, poison: 0, cmdrDmg: {}, dead: false, deathAt: null, deathCause: null,
  }
}

function seat(name: string): GameSessionSeat {
  return {
    playerId: `member-${name}`, playerName: name, isYou: false, isGuest: false, guestName: '',
    deckId: null, deckName: null, deckColors: [], deckCommander: null,
  }
}

function seedGame(over: Partial<GameResultData> = {}) {
  const result: GameResultData = {
    podId: POD_ID,
    players: [gtPlayer(0, 'Alex'), gtPlayer(1, 'Jordan')],
    durationSec: 1800,
    endReason: 'won',
    ...over,
  }
  const session: GameSessionData = { podId: POD_ID, startLife: 40, seats: [seat('Alex'), seat('Jordan')] }
  localStorage.setItem(RESULT_KEY, JSON.stringify(result))
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pods/:id/game/survey', component: GameSurveyView },
      { path: '/home', component: Stub },
      { path: '/games/:id', component: Stub },
    ],
  })
  await router.push(`/pods/${POD_ID}/game/survey`)
  await router.isReady()
  const wrapper = mount(GameSurveyView, {
    global: { plugins: [createPinia(), router, i18n] },
  })
  await flushPromises()
  return wrapper
}

function hintFor(wrapper: Awaited<ReturnType<typeof mountView>>) {
  const describedBy = wrapper.get('textarea').attributes('aria-describedby')
  expect(describedBy).toBeTruthy()
  return wrapper.get(`[id="${describedBy}"]`).text()
}

beforeEach(() => {
  setI18nLocale('en')
  localStorage.clear()
  vi.mocked(api.post).mockReset()
})

afterEach(() => setI18nLocale('en'))

describe('GameSurveyView', () => {
  it('tells players their note will be visible to the pod', async () => {
    seedGame()
    const wrapper = await mountView()
    expect(hintFor(wrapper)).toBe('Everyone in the pod can read your note.')
  })

  it('shows the hint in German', async () => {
    setI18nLocale('de')
    seedGame()
    const wrapper = await mountView()
    expect(hintFor(wrapper)).toBe('Alle im Pod können deine Notiz lesen.')
  })

  it('sends the retire notes with a retired game', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'game-1' })
    seedGame({ endReason: 'abandoned', abandonReasons: ['other'], abandonNotes: 'Venue closed' })
    const wrapper = await mountView()

    const skip = () => wrapper.findAll('button').find(b => b.text() === 'Skip')!.trigger('click')
    await skip()
    await skip()
    await flushPromises()

    expect(api.post).toHaveBeenCalledTimes(1)
    const [path, body] = vi.mocked(api.post).mock.calls[0]!
    expect(path).toBe('/games')
    expect(body).toMatchObject({
      endReason: 'abandoned',
      abandonReasons: ['other'],
      abandonNotes: 'Venue closed',
    } satisfies Partial<CreateGameBody>)
  })
})
