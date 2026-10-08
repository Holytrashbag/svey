import { test, expect, type Page } from '@playwright/test'
import { API_URL, THIRD_USER } from './env'
import { signInContext } from './helpers/session'

type PlayerStats = { totalGames: number; totalWins: number; winRate: number | null; avgPlacement: number | null }
type PodSeats = { podId: string; memberId: string }

// Personal stats are global per user and other specs post games for Alex and
// Jordan, so this file uses Kenji, whom no other spec touches, and asserts deltas.
test.describe.configure({ mode: 'serial' })

async function stats(page: Page): Promise<PlayerStats> {
  const res = await page.request.get(`${API_URL}/api/users/me/stats`)
  expect(res.ok()).toBe(true)
  return (await res.json()) as PlayerStats
}

async function createPod(page: Page, label: string): Promise<PodSeats> {
  const name = `E2E win rate ${label} ${Math.random().toString(36).slice(2, 8)}`
  const created = await page.request.post(`${API_URL}/api/playgroups`, { data: { name } })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }
  const detail = await page.request.get(`${API_URL}/api/playgroups/${id}`)
  const { members } = (await detail.json()) as { members: { id: string; you: boolean }[] }
  const me = members.find((m) => m.you)
  expect(me, 'Kenji member').toBeDefined()
  return { podId: id, memberId: me!.id }
}

async function deckId(page: Page, name: string): Promise<string> {
  const res = await page.request.get(`${API_URL}/api/decks`)
  const { decks } = (await res.json()) as { decks: { id: string; name: string }[] }
  const deck = decks.find((d) => d.name === name)
  expect(deck, `deck ${name}`).toBeDefined()
  return deck!.id
}

// Kenji plays one deck against a guest on his other deck.
async function postGame(
  page: Page,
  pod: PodSeats,
  decks: { kenji: string; guest: string },
  endReason: 'won' | 'abandoned',
  kenjiWins: boolean,
) {
  const res = await page.request.post(`${API_URL}/api/games`, {
    data: {
      podId: pod.podId,
      durationSec: 600,
      endReason,
      ...(endReason === 'abandoned' ? { abandonReasons: ['time'] } : {}),
      players: [
        {
          name: 'Kenji', isGuest: false, memberId: pod.memberId, deckId: decks.kenji,
          finalLife: kenjiWins ? 20 : 0, poison: 0, deathCause: kenjiWins ? 'none' : 'life', deathAt: null,
          isWinner: kenjiWins, surveyFun: null, surveyAgency: null, surveyTakeaway: '',
        },
        {
          name: 'Morgan', isGuest: true, memberId: null, deckId: decks.guest,
          finalLife: kenjiWins ? 0 : 20, poison: 0, deathCause: kenjiWins ? 'life' : 'none', deathAt: null,
          isWinner: !kenjiWins && endReason === 'won', surveyFun: null, surveyAgency: null, surveyTakeaway: '',
        },
      ],
    },
  })
  expect(res.status()).toBe(201)
}

test('home and profile show the same personal win rate, summed across pods', async ({ browser }) => {
  const kenji = await signInContext(browser, THIRD_USER)
  try {
    const page = kenji.page
    const decks = {
      kenji: await deckId(page, 'Korvold Treasure Feast'),
      guest: await deckId(page, 'Miirym Dragon Copies'),
    }
    const s0 = await stats(page)
    for (const label of ['A', 'B']) {
      const pod = await createPod(page, label)
      await postGame(page, pod, decks, 'won', true)
      for (let i = 0; i < 4; i++) await postGame(page, pod, decks, 'won', false)
    }
    const s1 = await stats(page)
    expect(s1.totalGames - s0.totalGames).toBe(10)
    expect(s1.totalWins - s0.totalWins).toBe(2)
    const expected = Math.round((s1.totalWins / s1.totalGames) * 100)
    expect(s1.winRate).toBe(expected)

    await page.goto('/home')
    const homeStat = page.getByRole('group', { name: 'Win rate All pods' })
    await expect(homeStat).toContainText(`${expected}%`)

    await page.goto('/profile')
    await expect(page.getByRole('group', { name: 'Win Rate', exact: true })).toContainText(`${expected}%`)
  } finally {
    await kenji.close()
  }
})

test("retired games don't change the personal win rate", async ({ browser }) => {
  const kenji = await signInContext(browser, THIRD_USER)
  try {
    const page = kenji.page
    const decks = {
      kenji: await deckId(page, 'Korvold Treasure Feast'),
      guest: await deckId(page, 'Miirym Dragon Copies'),
    }
    const s0 = await stats(page)
    const pod = await createPod(page, 'retired')
    await postGame(page, pod, decks, 'abandoned', true)
    await postGame(page, pod, decks, 'abandoned', false)
    expect(await stats(page)).toEqual(s0)

    await page.goto('/home')
    const expected = Math.round((s0.totalWins / s0.totalGames) * 100)
    await expect(page.getByRole('group', { name: 'Win rate All pods' })).toContainText(`${expected}%`)
  } finally {
    await kenji.close()
  }
})
