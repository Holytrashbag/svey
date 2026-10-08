import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n, { setI18nLocale } from '@/i18n'
import DeckRow, { type Deck } from './DeckRow.vue'

function deck(over: Partial<Deck>): Deck {
  return {
    id: 'd', name: 'Atraxa', commander: null, colorIdentity: [], bracket: 3,
    wins: 0, losses: 0, isArchived: false, ...over,
  }
}

function render(d: Deck) {
  return mount(DeckRow, { props: { deck: d }, global: { plugins: [i18n] } }).text()
}

beforeAll(() => setI18nLocale('en'))

describe('DeckRow', () => {
  it('a deck without games shows 0W, 0% and 0 games', () => {
    const text = render(deck({}))
    expect(text).toContain('0W·0%')
    expect(text).toContain('0%')
    expect(text).toContain('0 games')
    expect(text).not.toContain('NaN')
  })

  it('3 wins and 1 loss shows 3W, 75% and 4 games', () => {
    const text = render(deck({ wins: 3, losses: 1 }))
    expect(text).toContain('3W·75%')
    expect(text).toContain('75%')
    expect(text).toContain('4 games')
  })
})
