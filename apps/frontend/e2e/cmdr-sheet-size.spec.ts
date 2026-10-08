import { test, expect } from './fixtures'
import { openCmdrDmg, openSetup, seatGuest, seatMember, setSeatCount, startGame } from './helpers/game'

test('the commander damage sheet is tall, has 44px steppers and fits 360px with six seats', async ({ page, pod }) => {
  await openSetup(page, pod.id)
  await setSeatCount(page, 6)
  await seatMember(page, 1, 'Alex', 'Atraxa Superfriends')
  await seatMember(page, 2, 'Jordan', 'Yuriko Ninjutsu')
  for (const [seatNo, name] of [[3, 'Morgan'], [4, 'Riley'], [5, 'Sam'], [6, 'Taylor']] as const) {
    await seatGuest(page, seatNo, name, 'Krenko Goblin Tide')
  }
  await startGame(page, pod.id)

  const sheet = await openCmdrDmg(page, 'Jordan')
  const viewport = page.viewportSize()!

  // Fills most of the screen height.
  const box = (await sheet.boundingBox())!
  expect(box.height).toBeGreaterThan(viewport.height * 0.8)

  // Every stepper button is at least 44x44.
  for (const dir of ['More', 'Less']) {
    for (const name of ['Alex', 'Morgan', 'Riley', 'Sam', 'Taylor']) {
      const b = (await sheet.getByRole('button', { name: `${dir} damage from ${name}`, exact: true }).boundingBox())!
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
  }

  // No horizontal overflow.
  const overflow = await sheet.evaluate(el => el.scrollWidth > el.clientWidth)
  expect(overflow).toBe(false)
  const body = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(body).toBe(false)
})
