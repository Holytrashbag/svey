import type { Page } from '@playwright/test'
import { test, expect, type Pod } from './fixtures'
import { API_URL, SECOND_USER } from './env'
import { signInContext } from './helpers/session'

type DeckRecord = { id: string; name: string; wins: number; losses: number }
type Member = { id: string; name: string }

const KENRITH = 'Kenrith Group Hug'

async function decks(page: Page): Promise<DeckRecord[]> {
  const res = await page.request.get(`${API_URL}/api/decks`)
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { decks: DeckRecord[] }).decks
}

async function findDeck(page: Page, name: string) {
  const deck = (await decks(page)).find((d) => d.name === name)
  expect(deck, `deck ${name}`).toBeDefined()
  return deck as DeckRecord
}

type Seat = { memberId: string; name: string; deckId: string; isWinner: boolean }

// Alex posts the games (he is in the pod); Jordan's deck sits in one seat.
async function postGame(page: Page, podId: string, endReason: 'won' | 'draw' | 'abandoned', seats: Seat[]) {
  const res = await page.request.post(`${API_URL}/api/games`, {
    data: {
      podId,
      durationSec: 600,
      endReason,
      ...(endReason === 'abandoned' ? { abandonReasons: ['time'] } : {}),
      players: seats.map((s) => ({
        name: s.name,
        isGuest: false,
        memberId: s.memberId,
        deckId: s.deckId,
        finalLife: s.isWinner ? 20 : 0,
        poison: 0,
        deathCause: s.isWinner ? 'none' : 'life',
        deathAt: null,
        isWinner: s.isWinner,
        surveyFun: null,
        surveyAgency: null,
        surveyTakeaway: '',
      })),
    },
  })
  expect(res.status()).toBe(201)
}

// Posts: Jordan wins on Kenrith, Alex borrows Kenrith and wins, Jordan loses on
// Kenrith, one draw and one retired game. Expected delta: +2 wins, +2 losses.
async function playKenrithGames(alex: Page, pod: Pod, kenrithId: string, jordanOtherDeckId: string) {
  const res = await alex.request.get(`${API_URL}/api/playgroups/${pod.id}`)
  const { members } = (await res.json()) as { members: Member[] }
  const a = members.find((m) => m.name === 'Alex')
  const j = members.find((m) => m.name === SECOND_USER.name)
  expect(a && j).toBeTruthy()
  const alexDeck = await findDeck(alex, 'Atraxa Superfriends')

  const jordanKenrith = (win: boolean): Seat => ({ memberId: j!.id, name: 'Jordan', deckId: kenrithId, isWinner: win })
  const alexAtraxa = (win: boolean): Seat => ({ memberId: a!.id, name: 'Alex', deckId: alexDeck.id, isWinner: win })

  await postGame(alex, pod.id, 'won', [jordanKenrith(true), alexAtraxa(false)])
  await postGame(alex, pod.id, 'won', [
    { memberId: a!.id, name: 'Alex', deckId: kenrithId, isWinner: true },
    { memberId: j!.id, name: 'Jordan', deckId: jordanOtherDeckId, isWinner: false },
  ])
  await postGame(alex, pod.id, 'won', [jordanKenrith(false), alexAtraxa(true)])
  await postGame(alex, pod.id, 'draw', [jordanKenrith(false), alexAtraxa(false)])
  await postGame(alex, pod.id, 'abandoned', [jordanKenrith(false), alexAtraxa(false)])
}

test.describe('decklist record', () => {
  // One test posts the games, because deck records are global and parallel tests
  // posting to the same deck would see each other's games in their deltas.
  test('decklist counts wins, losses and draws for a borrowed deck, skips retired games and matches the detail stats', async ({ page, pod, browser }) => {
    const jordan = await signInContext(browser, SECOND_USER)
    try {
      const all = await decks(jordan.page)
      const kenrith = all.find((d) => d.name === KENRITH)
      const other = all.find((d) => d.name !== KENRITH)
      expect(kenrith && other).toBeTruthy()
      const { wins: w0, losses: l0 } = kenrith!

      type Stats = { general: { games: number; wins: number } | null }
      const stats = async () => {
        const res = await jordan.page.request.get(`${API_URL}/api/decks/${kenrith!.id}/stats`)
        return ((await res.json()) as Stats).general ?? { games: 0, wins: 0 }
      }
      const g0 = await stats()

      await playKenrithGames(page, pod, kenrith!.id, other!.id)

      const after = await findDeck(jordan.page, KENRITH)
      expect(after.wins).toBe(w0 + 2)
      expect(after.losses).toBe(l0 + 2)

      // The detail page's "general" scope agrees on wins and still counts the retired game.
      const g1 = await stats()
      expect(g1.wins - g0.wins).toBe(2)
      expect(g1.games - g0.games).toBe(5)

      await jordan.page.goto('/decks')
      const row = jordan.page.getByRole('button', { name: new RegExp(KENRITH) })
      const games = w0 + l0 + 4
      await expect(row).toContainText(`${w0 + 2}W`)
      await expect(row).toContainText(`${Math.round(((w0 + 2) / games) * 100)}%`)
      await expect(row).toContainText(`${games} games`)
    } finally {
      await jordan.close()
    }
  })

  test('sorting the decklist by most wins and best winrate orders the rows by their record', async ({ page }) => {
    await page.goto('/decks')
    await expect(page.getByRole('button', { name: /^Sort:/ })).toBeVisible()
    await expect(page.locator('button.rounded-2xl').first()).toBeVisible()

    const rowTexts = () => page.locator('button.rounded-2xl').allInnerTexts()
    const nums = (rows: string[], re: RegExp) => rows.map((r) => Number(re.exec(r)?.[1] ?? NaN))
    const nonIncreasing = (xs: number[]) => xs.every((x, i) => i === 0 || (xs[i - 1] ?? 0) >= x)

    await page.getByRole('button', { name: /^Sort:/ }).click()
    await page.getByRole('button', { name: 'Best winrate', exact: true }).click()
    const byRate = nums(await rowTexts(), /(\d+)%/)
    expect(byRate.length).toBeGreaterThan(0)
    expect(nonIncreasing(byRate)).toBe(true)

    await page.getByRole('button', { name: /^Sort:/ }).click()
    await page.getByRole('button', { name: 'Most wins', exact: true }).click()
    expect(nonIncreasing(nums(await rowTexts(), /(\d+)\s*W/))).toBe(true)
  })
})
