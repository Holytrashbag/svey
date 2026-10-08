import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18n, { setI18nLocale } from '@/i18n'
import type { GtPlayer } from '@/lib/game-tracker'
import GtPlayerTile from './GtPlayerTile.vue'

vi.mock('@/lib/api', () => ({ apiUrl: (path: string) => path }))

function player(life = 40): GtPlayer {
  return {
    seatIdx: 0, name: 'Ada', isYou: false, isGuest: false, deck: null,
    life, poison: 0, cmdrDmg: {}, dead: false, deathAt: null, deathCause: null,
  }
}

function render(life = 40) {
  return mount(GtPlayerTile, {
    props: { player: player(life), rotated: false, isWinner: false, gameEnded: false, nowSec: 0 },
    global: { plugins: [i18n] },
  })
}

async function setLife(wrapper: ReturnType<typeof render>, life: number) {
  await wrapper.setProps({ player: player(life) })
  await nextTick()
}

beforeAll(() => setI18nLocale('en'))
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }))
afterEach(() => vi.useRealTimers())

describe('GtPlayerTile life delta', () => {
  it('shows no delta on mount', () => {
    expect(render().text()).not.toMatch(/-\d|\+[1-9]/)
  })

  it('shows a negative delta when life drops from outside the tile', async () => {
    const w = render()
    await setLife(w, 37)
    expect(w.text()).toContain('-3')
  })

  it('follows a correction back up', async () => {
    const w = render()
    await setLife(w, 37)
    await setLife(w, 39)
    expect(w.text()).toContain('-1')
    await setLife(w, 42)
    expect(w.text()).toContain('+2')
  })

  it('counts its own +/- buttons once', async () => {
    const w = render()
    const minus = w.get('button[aria-label="Subtract 1 life"]')
    await minus.trigger('click')
    await setLife(w, 39)
    vi.advanceTimersByTime(60)
    await minus.trigger('click')
    await setLife(w, 38)
    expect(w.emitted('lifeChange')).toEqual([[-1], [-1]])
    expect(w.text()).toContain('-2')
    expect(w.text()).not.toContain('-4')
  })

  it('clears the delta after 5s', async () => {
    const w = render()
    await setLife(w, 37)
    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(w.text()).not.toContain('-3')
  })
})
