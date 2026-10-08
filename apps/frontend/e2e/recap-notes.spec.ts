import type { Locator } from '@playwright/test'
import { test, expect } from './fixtures'
import { API_URL, SECOND_USER, THIRD_USER } from './env'
import {
  createGameBody,
  dialog,
  isCreateGame,
  openGameMenu,
  openSetup,
  player,
  recapPlayer,
  seatGuest,
  seatMember,
  setSeatCount,
  startGame,
  tile,
} from './helpers/game'
import { signInContext } from './helpers/session'
import type { GameDetail } from '../src/types/api'

// Markup that must stay literal text, plus an unbroken run that has to wrap.
const ALEX_NOTE = `<b>gg</b> ${'A'.repeat(120)} Atraxa did Atraxa things.`
const MORGAN_NOTE = 'Goblins forever.'

async function expectFitsPhone(note: Locator) {
  const box = await note.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(360)
  expect(await note.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
}

test('survey notes show on the recap for every pod member, and not to outsiders', async ({ page, pod, browser }) => {
  expect(page.viewportSize()?.width).toBe(360)

  await openSetup(page, pod.id)
  await setSeatCount(page, 3)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await seatGuest(page, 3, 'Morgan', 'Krenko Goblin Tide')
  await startGame(page, pod.id)

  const morgan = tile(page, 'Morgan')
  await morgan.getByRole('button', { name: 'Player menu', exact: true }).click()
  await morgan.getByRole('button', { name: /^Player died/ }).click()
  await dialog(page, /^Morgan .* eliminated\?$/).getByRole('button', { name: /^Confirm .* they're out$/ }).click()
  await expect(morgan).toContainText('Eliminated')

  const jordan = tile(page, 'Jordan')
  await jordan.getByRole('button', { name: 'Player menu', exact: true }).click()
  await jordan.getByRole('button', { name: /^Concede/ }).click()
  await dialog(page, /^Jordan .* concede$/).getByRole('button', { name: 'Concede', exact: true }).click()
  await expect(page).toHaveURL(`/pods/${pod.id}/game/survey`)

  // Survey: the note field says who can read it.
  await expect(page.getByText('How did it feel, Alex?')).toBeVisible()
  const note = page.getByRole('textbox', { name: /^Anything to add\?/ })
  await expect(note).toHaveAccessibleDescription('Everyone in the pod can read your note.')
  await expect(page.getByText('Everyone in the pod can read your note.', { exact: true })).toBeVisible()
  await note.fill(ALEX_NOTE)
  await page.getByRole('button', { name: 'Next player →', exact: true }).click()

  await expect(page.getByText('How did it feel, Jordan?')).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()

  await expect(page.getByText('How did it feel, Morgan?')).toBeVisible()
  await page.getByRole('textbox', { name: /^Anything to add\?/ }).fill(MORGAN_NOTE)
  const posted = page.waitForRequest(isCreateGame)
  await page.getByRole('button', { name: 'Finish', exact: true }).click()

  const body = createGameBody(await posted)
  expect(player(body, 'Alex').surveyTakeaway).toBe(ALEX_NOTE)
  expect(player(body, 'Jordan').surveyTakeaway).toBe('')
  expect(player(body, 'Morgan').surveyTakeaway).toBe(MORGAN_NOTE)

  // Recap: notes next to each result, as plain text, wrapped inside the phone.
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/)
  const gameId = page.url().split('/').pop() ?? ''

  const alexNote = recapPlayer(page, 'Alex').getByRole('blockquote')
  await expect(alexNote).toHaveText(ALEX_NOTE)
  expect(await alexNote.innerHTML()).not.toContain('<b>')
  await expectFitsPhone(alexNote)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)

  await expect(recapPlayer(page, 'Jordan')).toBeVisible()
  await expect(recapPlayer(page, 'Jordan').getByRole('blockquote')).toHaveCount(0)
  await expect(recapPlayer(page, 'Morgan').getByRole('blockquote')).toHaveText(MORGAN_NOTE)
  await expect(page.getByRole('region', { name: 'Why it was retired' })).toHaveCount(0)

  const saved = await page.request.get(`${API_URL}/api/games/${gameId}`)
  expect(saved.ok()).toBe(true)
  const recap = (await saved.json()) as GameDetail
  expect(recap).toMatchObject({ endReason: 'won', abandonReasons: [], abandonNotes: null })
  expect(Object.fromEntries(recap.players.map((p) => [p.name, p.note]))).toEqual({
    Alex: ALEX_NOTE, Jordan: null, Morgan: MORGAN_NOTE,
  })

  // Another pod member (Jordan, who didn't host) reads the same notes.
  const jordanSession = await signInContext(browser, SECOND_USER)
  try {
    await jordanSession.page.goto(`/games/${gameId}`)
    await expect(recapPlayer(jordanSession.page, 'Alex').getByRole('blockquote')).toHaveText(ALEX_NOTE)
    await expect(recapPlayer(jordanSession.page, 'Morgan').getByRole('blockquote')).toHaveText(MORGAN_NOTE)
  } finally {
    await jordanSession.close()
  }

  // Kenji isn't in this pod: 403 from the API and nothing to read on the page.
  // He only reads here, so the personal-stats specs that own his games are unaffected.
  const kenji = await signInContext(browser, THIRD_USER)
  try {
    const denied = await kenji.page.request.get(`${API_URL}/api/games/${gameId}`)
    expect(denied.status()).toBe(403)
    const text = await denied.text()
    expect(JSON.parse(text)).toMatchObject({ error: { code: 'FORBIDDEN' } })
    expect(text).not.toContain('Atraxa did Atraxa things.')

    await kenji.page.goto(`/games/${gameId}`)
    await expect(kenji.page.getByText('Not a member of this playgroup', { exact: true })).toBeVisible()
    await expect(kenji.page.getByRole('blockquote')).toHaveCount(0)
  } finally {
    await kenji.close()
  }
})

test('retire notes show with the reasons on the recap', async ({ page, pod }) => {
  const RETIRE_NOTE = 'Venue closed early, Jordan was on 3 life.'

  await openSetup(page, pod.id)
  await setSeatCount(page, 2)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await startGame(page, pod.id)

  const menu = await openGameMenu(page)
  await menu.getByRole('button', { name: /^Retire game/ }).click()
  const retire = dialog(page, 'Retire this game?')
  await retire.getByRole('button', { name: /^Out of time/ }).click()
  await retire.getByRole('button', { name: /^Other/ }).click()
  const notes = retire.getByRole('textbox', { name: 'Notes', exact: true })
  await expect(notes).toHaveAccessibleDescription('Shown on the game recap to everyone in the pod.')
  await notes.fill(RETIRE_NOTE)
  await retire.getByRole('button', { name: 'Retire game', exact: true }).click()
  await expect(page).toHaveURL(`/pods/${pod.id}/game/survey`)

  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  const posted = page.waitForRequest(isCreateGame)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()

  expect(createGameBody(await posted)).toMatchObject({
    endReason: 'abandoned',
    abandonReasons: ['time', 'other'],
    abandonNotes: RETIRE_NOTE,
  })

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/)
  const gameId = page.url().split('/').pop() ?? ''
  const card = page.getByRole('region', { name: 'Why it was retired' })
  await expect(card).toContainText('Out of time')
  await expect(card).toContainText('Other')
  await expect(card.getByRole('blockquote')).toHaveText(RETIRE_NOTE)
  await expectFitsPhone(card.getByRole('blockquote'))

  const saved = await page.request.get(`${API_URL}/api/games/${gameId}`)
  expect(await saved.json()).toMatchObject({
    endReason: 'abandoned',
    abandonReasons: ['time', 'other'],
    abandonNotes: RETIRE_NOTE,
  })
})
