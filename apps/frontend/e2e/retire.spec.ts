import { test, expect } from './fixtures'
import { API_URL } from './env'
import {
  createGameBody,
  dialog,
  isCreateGame,
  openGameMenu,
  openSetup,
  seatMember,
  setSeatCount,
  startGame,
  tile,
} from './helpers/game'

test('retiring saves the game with endReason abandoned', async ({ page, pod }) => {
  await openSetup(page, pod.id)
  await setSeatCount(page, 2)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await startGame(page, pod.id)

  const jordan = tile(page, 'Jordan')
  await jordan.getByRole('button', { name: 'Add 1 life', exact: true }).click()
  await expect(jordan.getByText('41', { exact: true })).toBeVisible()

  const menu = await openGameMenu(page)
  await menu.getByRole('button', { name: /^Retire game/ }).click()
  const retire = dialog(page, 'Retire this game?')
  await retire.getByRole('button', { name: /^Out of time/ }).click()
  await retire.getByRole('button', { name: 'Retire game', exact: true }).click()
  await expect(page).toHaveURL(`/pods/${pod.id}/game/survey`)

  // Both players skip the survey; the last skip saves the game.
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  const posted = page.waitForRequest(isCreateGame)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()

  const body = createGameBody(await posted)
  expect(body).toMatchObject({ podId: pod.id, endReason: 'abandoned', abandonReasons: ['time'] })
  expect(body.players.map((p) => p.isWinner)).toEqual([false, false])

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/)
  const gameId = page.url().split('/').pop() ?? ''
  await expect(page.getByText('Abandoned', { exact: true }).first()).toBeVisible()

  const saved = await page.request.get(`${API_URL}/api/games/${gameId}`)
  expect(saved.ok()).toBe(true)
  expect(await saved.json()).toMatchObject({ endReason: 'abandoned' })
})
