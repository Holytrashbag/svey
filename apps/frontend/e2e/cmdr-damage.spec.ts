import { test, expect } from './fixtures'
import {
  closeSheet,
  createGameBody,
  dialog,
  isCreateGame,
  openCmdrDmg,
  openSetup,
  player,
  seatGuest,
  seatMember,
  setSeatCount,
  startGame,
  stepCmdrDmg,
  tile,
} from './helpers/game'

test('commander damage lowers life and a correction restores it', async ({ page, pod }) => {
  await openSetup(page, pod.id)
  await setSeatCount(page, 2)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await startGame(page, pod.id)

  const jordan = tile(page, 'Jordan')
  const sheet = await openCmdrDmg(page, 'Jordan')

  await stepCmdrDmg(sheet, 'Alex', 'More', 3)
  await expect(jordan.getByText('37', { exact: true })).toBeVisible()
  await expect(jordan.getByText('-3', { exact: true })).toBeVisible()

  await stepCmdrDmg(sheet, 'Alex', 'Less', 1)
  await expect(jordan.getByText('38', { exact: true })).toBeVisible()
  await expect(jordan.getByText('-2', { exact: true })).toBeVisible()

  await stepCmdrDmg(sheet, 'Alex', 'Less', 2)
  await expect(jordan.getByText('40', { exact: true })).toBeVisible()

  await closeSheet(sheet)
  await expect(tile(page, 'Alex').getByText('40', { exact: true })).toBeVisible()
  await expect(jordan.getByRole('button', { name: /poison$/ })).toContainText('0')
})

test('a commander hit that crosses 21 and 0 life records commander damage and freezes the target', async ({ page, pod }) => {
  await openSetup(page, pod.id)
  await setSeatCount(page, 3)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  await seatGuest(page, 3, 'Morgan', 'Krenko Goblin Tide')
  await startGame(page, pod.id)

  const sheet = await openCmdrDmg(page, 'Jordan')
  await stepCmdrDmg(sheet, 'Morgan', 'More', 19) // life 21
  await stepCmdrDmg(sheet, 'Alex', 'More', 20) // life 1
  await stepCmdrDmg(sheet, 'Alex', 'More', 1) // life 0 and 21 from Alex at once

  const jordan = tile(page, 'Jordan')
  await expect(jordan).toContainText('Eliminated')
  await expect(jordan).toContainText('Commander damage')

  // No revive: a dead target's numbers are frozen.
  await expect(sheet.getByRole('button', { name: 'Less damage from Alex', exact: true })).toBeDisabled()
  await expect(sheet.getByRole('button', { name: 'More damage from Morgan', exact: true })).toBeDisabled()
  await closeSheet(sheet)

  // Morgan concedes; Alex is the last one standing.
  const morgan = tile(page, 'Morgan')
  await morgan.getByRole('button', { name: 'Player menu', exact: true }).click()
  await morgan.getByRole('button', { name: /^Concede/ }).click()
  await dialog(page, /^Morgan .* concede$/).getByRole('button', { name: 'Concede', exact: true }).click()
  await expect(page).toHaveURL(`/pods/${pod.id}/game/survey`)

  const skip = page.getByRole('button', { name: 'Skip', exact: true })
  await skip.click()
  await skip.click()
  const posted = page.waitForRequest(isCreateGame)
  await skip.click()

  const body = createGameBody(await posted)
  expect(player(body, 'Jordan')).toMatchObject({ deathCause: 'cmdr_dmg', finalLife: 0, isWinner: false })
  expect(player(body, 'Alex')).toMatchObject({ isWinner: true, finalLife: 40 })
  expect(player(body, 'Morgan')).toMatchObject({ deathCause: 'conceded' })
})
