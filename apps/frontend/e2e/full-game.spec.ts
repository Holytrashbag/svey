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
  setSeatCount,
  startGame,
  tile,
} from './helpers/game'

test('plays a full game from setup to a saved recap', async ({ page, pod }) => {
  // Setup: two pod members and a guest who borrows Alex's second deck.
  await openSetup(page, pod.id)
  await setSeatCount(page, 3)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await seatGuest(page, 3, 'Morgan', 'Krenko Goblin Tide')
  await startGame(page, pod.id)

  // Life change
  const alex = tile(page, 'Alex')
  await alex.getByRole('button', { name: 'Subtract 1 life', exact: true }).click()
  await expect(alex.getByText('39', { exact: true })).toBeVisible()

  // Manual elimination (card effect)
  const morgan = tile(page, 'Morgan')
  await morgan.getByRole('button', { name: 'Player menu', exact: true }).click()
  await morgan.getByRole('button', { name: /^Player died/ }).click()
  await dialog(page, /^Morgan .* eliminated\?$/).getByRole('button', { name: /^Confirm .* they're out$/ }).click()
  await expect(morgan).toContainText('Eliminated')
  await expect(page).toHaveURL(`/pods/${pod.id}/game/tracker`)

  // Jordan concedes; Alex is the last one standing, which ends the game.
  const jordan = tile(page, 'Jordan')
  await jordan.getByRole('button', { name: 'Player menu', exact: true }).click()
  await jordan.getByRole('button', { name: /^Concede/ }).click()
  await dialog(page, /^Jordan .* concede$/).getByRole('button', { name: 'Concede', exact: true }).click()
  await expect(page).toHaveURL(`/pods/${pod.id}/game/survey`)

  // Survey: Alex answers, Jordan and Morgan skip.
  await expect(page.getByText('How did it feel, Alex?')).toBeVisible()
  await page.getByRole('group', { name: 'How much fun did you have?', exact: true })
    .getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('group', { name: 'Did you feel in control?', exact: true })
    .getByRole('button', { name: '5', exact: true }).click()
  await page.getByPlaceholder('Highlights, gripes, shoutouts...').fill('Atraxa did Atraxa things.')
  await page.getByRole('button', { name: 'Next player →', exact: true }).click()

  await expect(page.getByText('How did it feel, Jordan?')).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()

  await expect(page.getByText('How did it feel, Morgan?')).toBeVisible()
  const posted = page.waitForRequest(isCreateGame)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()

  const body = createGameBody(await posted)
  expect(body).toMatchObject({ podId: pod.id, endReason: 'won' })
  expect(player(body, 'Alex')).toMatchObject({
    isWinner: true, finalLife: 39, surveyFun: 4, surveyAgency: 5, surveyTakeaway: 'Atraxa did Atraxa things.',
  })
  expect(player(body, 'Jordan')).toMatchObject({ isWinner: false, deathCause: 'conceded', surveyFun: null })
  expect(player(body, 'Morgan')).toMatchObject({
    isGuest: true, memberId: null, isWinner: false, deathCause: 'special', surveyFun: null,
  })

  // Recap of the saved game
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/)
  const gameId = page.url().split('/').pop() ?? ''
  await expect(page.getByText('Winner', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('39 life', { exact: true })).toBeVisible()
  await expect(page.getByText('(1 response)', { exact: true })).toBeVisible()

  const saved = await page.request.get(`${API_URL}/api/games/${gameId}`)
  expect(saved.ok()).toBe(true)
  expect(await saved.json()).toMatchObject({ endReason: 'won', survey: { responseCount: 1 } })

  // The game shows up in the pod's recent games.
  const detail = await page.request.get(`${API_URL}/api/playgroups/${pod.id}`)
  expect(await detail.json()).toMatchObject({ totalGames: 1, recent: [{ id: gameId }] })
  await page.goto(`/pods/${pod.id}`)
  await expect(page.getByText('Recent games', { exact: true })).toBeVisible()
  await expect(page.getByText('Atraxa Superfriends')).toBeVisible()
})
