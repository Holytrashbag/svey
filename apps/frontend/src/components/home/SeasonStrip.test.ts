import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n, { setI18nLocale } from '@/i18n'
import SeasonStrip from './SeasonStrip.vue'

beforeAll(() => setI18nLocale('en'))

describe('SeasonStrip', () => {
  it('shows "—" and no percent sign when the win rate is unknown', () => {
    const wrapper = mount(SeasonStrip, {
      props: { wins: 0, winrate: null, threat: 0, playgroupName: 'Tuesday' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('%')
  })

  it('shows the win rate as a percentage', () => {
    const wrapper = mount(SeasonStrip, {
      props: { wins: 3, winrate: 75, threat: 7.5, playgroupName: 'Tuesday' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.text()).toContain('75%')
  })

  it('labels the win rate as covering all pods', () => {
    const wrapper = mount(SeasonStrip, {
      props: { wins: 3, winrate: 20, threat: 7.5, playgroupName: 'Tuesday' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.text()).toContain('All pods')
    const group = wrapper.find('[role="group"]')
    expect(group.exists()).toBe(true)
    const names = (group.attributes('aria-labelledby') ?? '')
      .split(' ')
      .map((id) => wrapper.find(`[id="${id}"]`).text())
    expect(names).toEqual(['Win rate', 'All pods'])
    expect(group.text()).toContain('20%')
  })

  it('uses the German all-pods label', () => {
    setI18nLocale('de')
    try {
      const wrapper = mount(SeasonStrip, {
        props: { wins: 3, winrate: 20, threat: 7.5, playgroupName: 'Tuesday' },
        global: { plugins: [i18n] },
      })
      expect(wrapper.text()).toContain('Alle Pods')
    } finally {
      setI18nLocale('en')
    }
  })
})
