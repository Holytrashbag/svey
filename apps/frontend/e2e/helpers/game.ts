import type { Locator, Page, Request } from '@playwright/test'
import { expect } from '@playwright/test'
import type { CreateGameBody } from '../../src/types/api'
import { API_URL } from '../env'

// UI drivers for the game flow. Locators use roles and the English copy from
// src/i18n/locales/en, scoped to the seat, sheet or tile they act on.

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function seat(page: Page, n: number): Locator {
  return page.getByRole('group', { name: `Seat ${n}`, exact: true })
}

export function dialog(page: Page, name: string | RegExp): Locator {
  return page.getByRole('dialog', typeof name === 'string' ? { name, exact: true } : { name })
}

export function tile(page: Page, name: string): Locator {
  return page.getByRole('group', { name, exact: true })
}

export async function openSetup(page: Page, podId: string) {
  await page.goto(`/pods/${podId}`)
  await page.getByRole('button', { name: 'New game', exact: true }).click()
  await expect(page).toHaveURL(`/pods/${podId}/game`)
}

export async function setSeatCount(page: Page, n: number) {
  const count = page.getByText(/^\d+\s*seats$/)
  for (let i = 0; i < 6; i++) {
    const current = Number((await count.innerText()).match(/\d+/)?.[0])
    if (current === n) return
    const button = current > n ? 'Remove a seat' : 'Add a seat'
    await page.getByRole('button', { name: button, exact: true }).click()
  }
  await expect(count).toHaveText(new RegExp(`^${n}\\s*seats$`))
}

async function pickDeck(page: Page, seatNo: number, player: string, deck: string) {
  await seat(page, seatNo).getByRole('button', { name: /Pick a deck/ }).click()
  await dialog(page, new RegExp(`^Pick a deck for ${escape(player)}`))
    .getByRole('button', { name: new RegExp(escape(deck)) })
    .click()
  await expect(seat(page, seatNo)).toContainText(deck)
}

export async function seatMember(page: Page, seatNo: number, name: string, deck: string) {
  await seat(page, seatNo).getByRole('button', { name: /Add player/ }).click()
  await dialog(page, 'Pick a player')
    .getByRole('button', { name: new RegExp(`\\b${escape(name)}\\b`) })
    .click()
  await pickDeck(page, seatNo, name, deck)
}

export async function seatGuest(page: Page, seatNo: number, name: string, deck: string) {
  await seat(page, seatNo).getByRole('button', { name: /Add player/ }).click()
  await dialog(page, 'Pick a player').getByRole('button', { name: 'Add a one-off guest', exact: true }).click()
  const guest = dialog(page, 'Add a guest')
  await guest.getByPlaceholder('Guest name').fill(name)
  await guest.getByRole('button', { name: 'Add guest', exact: true }).click()
  await pickDeck(page, seatNo, name, deck)
}

export async function startGame(page: Page, podId: string) {
  await page.getByRole('button', { name: /^Start game/ }).click()
  await expect(page).toHaveURL(`/pods/${podId}/game/tracker`)
}

export async function openGameMenu(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Game menu', exact: true }).click()
  return dialog(page, 'Game menu')
}

export function isCreateGame(req: Request): boolean {
  return req.method() === 'POST' && req.url() === `${API_URL}/api/games`
}

export function createGameBody(req: Request): CreateGameBody {
  return req.postDataJSON() as CreateGameBody
}

export function player(body: CreateGameBody, name: string) {
  const found = body.players.find((p) => p.name === name)
  if (!found) throw new Error(`no player "${name}" in the saved game`)
  return found
}
