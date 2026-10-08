import { describe, it, expect, beforeAll } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import i18n, { setI18nLocale } from '@/i18n'
import GtConcedeSheet from './GtConcedeSheet.vue'

type Mode = 'concede' | 'retire' | 'cancel'

function render(mode: Mode, open = true) {
  return mount(GtConcedeSheet, {
    props: { open, mode, player: null },
    global: { plugins: [i18n] },
  })
}

function button(wrapper: VueWrapper, name: RegExp) {
  const found = wrapper.findAll('button').find(b => name.test(b.text()))
  if (!found) throw new Error(`no button ${name}`)
  return found
}

beforeAll(() => setI18nLocale('en'))

describe('GtConcedeSheet retire notes', () => {
  it('retire mode emits the picked reasons and the trimmed note', async () => {
    const wrapper = render('retire')
    await button(wrapper, /^Other/).trigger('click')
    await wrapper.get('textarea').setValue('  Venue closed  ')
    await button(wrapper, /^Retire game$/).trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[['other'], 'Venue closed']])
  })

  it('retire mode tells the table the note is visible to the pod', () => {
    const wrapper = render('retire')
    const notes = wrapper.get('textarea')
    expect(notes.attributes('aria-label')).toBe('Notes')
    const hint = wrapper.get(`[id="${notes.attributes('aria-describedby')}"]`)
    expect(hint.text()).toBe('Shown on the game recap to everyone in the pod.')
  })

  it('concede and cancel modes show no notes field', () => {
    expect(render('concede').find('textarea').exists()).toBe(false)
    expect(render('cancel').find('textarea').exists()).toBe(false)
  })

  it('the note is cleared when the sheet reopens', async () => {
    const wrapper = render('retire')
    await wrapper.get('textarea').setValue('Stale note')
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })
})
