import { test, expect, type Page } from '@playwright/test'
import { API_URL, FOURTH_USER } from './env'
import { signInContext } from './helpers/session'

// Which pod comes first is global per user and every other spec creates pods for
// Alex, so this file uses Priya, whom no other spec touches. Her only seeded pod
// is Tuesday Night Commander, whose games are days old.
test.describe.configure({ mode: 'serial' })

const TUESDAY = 'Tuesday Night Commander'

type PodSeats = { podId: string; memberId: string; name: string }
type ActivePod = { id: string; name: string; lastPlayed: string | null }

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function createPod(page: Page, name: string): Promise<PodSeats> {
  const created = await page.request.post(`${API_URL}/api/playgroups`, { data: { name } })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }
  const detail = await page.request.get(`${API_URL}/api/playgroups/${id}`)
  const { members } = (await detail.json()) as { members: { id: string; you: boolean }[] }
  const me = members.find((m) => m.you)
  expect(me, 'Priya member').toBeDefined()
  return { podId: id, memberId: me!.id, name }
}

async function deckId(page: Page, name: string): Promise<string> {
  const res = await page.request.get(`${API_URL}/api/decks`)
  const { decks } = (await res.json()) as { decks: { id: string; name: string }[] }
  const deck = decks.find((d) => d.name === name)
  expect(deck, `deck ${name}`).toBeDefined()
  return deck!.id
}

// Priya beats a guest on her other deck. The game starts `durationSec` ago.
async function postGame(page: Page, pod: PodSeats, decks: { priya: string; guest: string }, durationSec: number) {
  const res = await page.request.post(`${API_URL}/api/games`, {
    data: {
      podId: pod.podId,
      durationSec,
      endReason: 'won',
      players: [
        {
          name: 'Priya', isGuest: false, memberId: pod.memberId, deckId: decks.priya,
          finalLife: 20, poison: 0, deathCause: 'none', deathAt: null,
          isWinner: true, surveyFun: null, surveyAgency: null, surveyTakeaway: '',
        },
        {
          name: 'Morgan', isGuest: true, memberId: null, deckId: decks.guest,
          finalLife: 0, poison: 0, deathCause: 'life', deathAt: null,
          isWinner: false, surveyFun: null, surveyAgency: null, surveyTakeaway: '',
        },
      ],
    },
  })
  expect(res.status()).toBe(201)
}

let priya: Awaited<ReturnType<typeof signInContext>>
let page: Page
// Expected order: played pods by recency, then never-played pods by name.
let expected: string[]
let newest: string
let older: string

test.beforeAll(async ({ browser }) => {
  priya = await signInContext(browser, FOURTH_USER)
  page = priya.page
  const decks = {
    priya: await deckId(page, 'Lathril Elfball'),
    guest: await deckId(page, 'Niv-Mizzet Wheels'),
  }
  const run = Math.random().toString(36).slice(2, 8)
  // Created in the reverse of the expected order, so member-row order is wrong
  const b = await createPod(page, `E2E order b ${run}`)
  const a = await createPod(page, `E2E order a ${run}`)
  const olderPod = await createPod(page, `E2E order older ${run}`)
  const newestPod = await createPod(page, `E2E order newest ${run}`)
  await postGame(page, olderPod, decks, 7200)
  await postGame(page, newestPod, decks, 60)
  newest = newestPod.name
  older = olderPod.name
  expected = [newest, older, TUESDAY, a.name, b.name]
})

test.afterAll(async () => {
  await priya?.close()
})

test('GET /api/playgroups lists pods most recently played first', async () => {
  const res = await page.request.get(`${API_URL}/api/playgroups`)
  expect(res.ok()).toBe(true)
  const { active } = (await res.json()) as { active: ActivePod[] }
  expect(active[0]?.name).toBe(newest)
  expect(active.map((p) => p.name).filter((n) => expected.includes(n))).toEqual(expected)
})

test('Home opens on the most recently played pod', async () => {
  await page.goto('/home')
  // The hero card is the parent of its "Active playgroup" switcher button; the
  // pod names in the closed switcher sheet and the other-pods strip don't count.
  const hero = page.getByRole('button', { name: 'Active playgroup' }).locator('xpath=..')
  await expect(hero.getByText(newest, { exact: true })).toBeVisible()
  await expect(hero.getByText(TUESDAY, { exact: true })).toHaveCount(0)
})

test('/pods lists pods most recently played first', async () => {
  await page.goto('/pods')
  const names = expected.map(escapeRegExp).join('|')
  const rows = page.getByRole('button', { name: new RegExp(names) })
  await expect(rows).toHaveCount(expected.length)
  for (const [i, name] of expected.entries()) {
    await expect(rows.nth(i)).toContainText(name)
  }
})
