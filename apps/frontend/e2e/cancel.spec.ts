import type { Request } from '@playwright/test'
import { test, expect } from './fixtures'
import { API_URL } from './env'
import {
  dialog,
  isCreateGame,
  openGameMenu,
  openSetup,
  seatMember,
  setSeatCount,
  startGame,
  tile,
} from './helpers/game'

test('cancelling discards the game without saving anything', async ({ page, pod }) => {
  const saves: Request[] = []
  page.on('request', (req) => {
    if (isCreateGame(req)) saves.push(req)
  })

  await openSetup(page, pod.id)
  await setSeatCount(page, 2)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await startGame(page, pod.id)

  const alex = tile(page, 'Alex')
  await alex.getByRole('button', { name: 'Subtract 1 life', exact: true }).click()
  await expect(alex.getByText('39', { exact: true })).toBeVisible()

  const menu = await openGameMenu(page)
  await menu.getByRole('button', { name: /^Cancel game/ }).click()
  await dialog(page, 'Cancel this game?').getByRole('button', { name: 'Cancel game', exact: true }).click()

  // Back on the setup screen with no session left behind and nothing posted.
  await expect(page).toHaveURL(`/pods/${pod.id}/game`)
  expect(await page.evaluate(() => localStorage.getItem('svey:game-session'))).toBeNull()
  expect(saves).toEqual([])

  const detail = await page.request.get(`${API_URL}/api/playgroups/${pod.id}`)
  expect(await detail.json()).toMatchObject({ totalGames: 0, recent: [] })
})
