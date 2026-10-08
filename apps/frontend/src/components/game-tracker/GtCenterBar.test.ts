import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n, { setI18nLocale } from '@/i18n'
import GtCenterBar from './GtCenterBar.vue'

function render() {
  return mount(GtCenterBar, {
    props: { elapsedSec: 125, paused: false, aliveCount: 3, totalCount: 4, gameEnded: false },
    global: { plugins: [i18n] },
  })
}

beforeAll(() => setI18nLocale('en'))

describe('GtCenterBar', () => {
  it('shows the game timer exactly once', () => {
    expect(render().text().match(/02:05/g)).toHaveLength(1)
  })

  it('shows the alive count on both sides', () => {
    const text = render().text()
    expect(text.match(/3\s*\/\s*4/g)).toHaveLength(2)
  })

  it('keeps the timer in the upright (non-rotated) section', () => {
    const w = render()
    const rotated = w.findAll('div').filter((d) => d.attributes('style')?.includes('rotate(180deg)'))
    expect(rotated).toHaveLength(1)
    expect(rotated[0]!.text()).not.toContain('02:05')
  })
})
