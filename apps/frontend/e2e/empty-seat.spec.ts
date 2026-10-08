import { test, expect } from './fixtures'
import { API_URL } from './env'
import {
  createGameBody,
  dialog,
  isCreateGame,
  openSetup,
  player,
  seatGuest,
  seatMember,
  startGame,
  tile,
} from './helpers/game'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

test('leaving a seat empty starts and saves the game with only the seated players', async ({ page, pod }) => {
  // Setup: the default 4 seats, seat 2 stays empty.
  await openSetup(page, pod.id)
  await expect(page.getByText(/^4\s*seats$/)).toBeVisible()
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 3, 'Jordan', 'Yuriko Ninjutsu')
  await seatGuest(page, 4, 'Morgan', 'Krenko Goblin Tide')
  await startGame(page, pod.id)

  // Tracker: three named tiles, no phantom "Seat N" tile.
  await expect(tile(page, 'Alex')).toBeVisible()
  await expect(tile(page, 'Jordan')).toBeVisible()
  await expect(tile(page, 'Morgan')).toBeVisible()
  await expect(page.getByRole('group', { name: /^Seat \d+$/ })).toHaveCount(0)

  // Jordan concedes: two players left, the game goes on.
  for (const name of ['Jordan', 'Morgan']) {
    const t = tile(page, name)
    await t.getByRole('button', { name: 'Player menu', exact: true }).click()
    await t.getByRole('button', { name: /^Concede/ }).click()
    await dialog(page, new RegExp(`^${name} .* concede$`)).getByRole('button', { name: 'Concede', exact: true }).click()
    if (name === 'Jordan') await expect(page).toHaveURL(`/pods/${pod.id}/game/tracker`)
  }
  // Alex is the last one standing, which ends the game.
  await expect(page).toHaveURL(`/pods/${pod.id}/game/survey`)

  await expect(page.getByText('How did it feel, Alex?')).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByText('How did it feel, Jordan?')).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByText('How did it feel, Morgan?')).toBeVisible()
  const posted = page.waitForRequest(isCreateGame)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()

  const body = createGameBody(await posted)
  expect(body.players.map(p => p.name)).toEqual(['Alex', 'Jordan', 'Morgan'])
  expect(body.players.every(p => UUID.test(p.deckId))).toBe(true)
  expect(player(body, 'Alex').isWinner).toBe(true)
  expect(player(body, 'Morgan')).toMatchObject({ isGuest: true, memberId: null })

  // Saved: Finish navigated to the recap and the API has exactly the seated players.
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/)
  const gameId = page.url().split('/').pop() ?? ''
  const saved = await page.request.get(`${API_URL}/api/games/${gameId}`)
  expect(saved.ok()).toBe(true)
  const game = (await saved.json()) as { players: { name: string }[] }
  expect(game.players.map(p => p.name)).toEqual(['Alex', 'Jordan', 'Morgan'])
})
