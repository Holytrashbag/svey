// Seeds a local database with a believable demo playgroup so the app can be
// explored (and screenshotted) without OAuth keys or an Archidekt account:
//   pnpm --filter api seed
// Then sign in with demo@example.com / svey-demo.
//
// Goes through the real services (createPlaygroup, joinPlaygroup, createGame)
// so the data has exactly the shape the app produces itself. Deterministic:
// the same seed always yields the same games. Refuses to run in production
// and does nothing if the demo user already exists.
import { eq, sql } from 'drizzle-orm'
import { pgTable, uuid, text } from 'drizzle-orm/pg-core'
import { db, pool } from '../lib/db.ts'
import { env } from '../lib/env.ts'
import { auth } from '../lib/auth.ts'
import { estimateBracket } from '../lib/bracket-estimator.ts'
import { deck, decklistCard, game, gamePlayer, playgroupMember } from '../db/schema.ts'
import { createPlaygroup, joinPlaygroup } from '../services/playgroup.service.ts'
import { createGame, type CreateGamePlayer } from '../services/game.service.ts'

if (env.NODE_ENV === 'production') {
  console.error('[seed] refusing to seed demo data into a production database')
  process.exit(1)
}

const DEMO_PASSWORD = 'svey-demo'

// ── Deterministic randomness ─────────────────────────────────────────────────

let state = 0x5eed
function rand(): number {
  // mulberry32
  state = (state + 0x6d2b79f5) | 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// ── Cards & decks ────────────────────────────────────────────────────────────

type Color = 'W' | 'U' | 'B' | 'R' | 'G'
type Card = { name: string; type: string; cost: string; cmc: number; colors: Color[]; salt: number }

// A small pool of real staples; each deck takes the ones inside its colours.
const STAPLES: Card[] = [
  { name: 'Sol Ring', type: 'Artifact', cost: '{1}', cmc: 1, colors: [], salt: 1.6 },
  { name: 'Arcane Signet', type: 'Artifact', cost: '{2}', cmc: 2, colors: [], salt: 0.3 },
  { name: 'Command Tower', type: 'Land', cost: '', cmc: 0, colors: [], salt: 0.1 },
  { name: 'Lightning Greaves', type: 'Artifact', cost: '{2}', cmc: 2, colors: [], salt: 0.4 },
  { name: 'Swords to Plowshares', type: 'Instant', cost: '{W}', cmc: 1, colors: ['W'], salt: 0.9 },
  { name: 'Smothering Tithe', type: 'Enchantment', cost: '{3}{W}', cmc: 4, colors: ['W'], salt: 2.4 },
  { name: 'Rhystic Study', type: 'Enchantment', cost: '{2}{U}', cmc: 3, colors: ['U'], salt: 2.9 },
  { name: 'Cyclonic Rift', type: 'Instant', cost: '{1}{U}', cmc: 2, colors: ['U'], salt: 2.6 },
  { name: 'Counterspell', type: 'Instant', cost: '{U}{U}', cmc: 2, colors: ['U'], salt: 1.2 },
  { name: 'Demonic Tutor', type: 'Sorcery', cost: '{1}{B}', cmc: 2, colors: ['B'], salt: 1.8 },
  { name: 'Phyrexian Arena', type: 'Enchantment', cost: '{1}{B}{B}', cmc: 3, colors: ['B'], salt: 0.8 },
  { name: 'Blasphemous Act', type: 'Sorcery', cost: '{8}{R}', cmc: 9, colors: ['R'], salt: 1.0 },
  { name: 'Dockside Extortionist', type: 'Creature', cost: '{1}{R}', cmc: 2, colors: ['R'], salt: 2.5 },
  { name: 'Beast Within', type: 'Instant', cost: '{2}{G}', cmc: 3, colors: ['G'], salt: 0.7 },
  { name: 'Cultivate', type: 'Sorcery', cost: '{2}{G}', cmc: 3, colors: ['G'], salt: 0.1 },
  { name: 'Eternal Witness', type: 'Creature', cost: '{1}{G}{G}', cmc: 3, colors: ['G'], salt: 0.3 },
]

const BASICS: Record<Color, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' }

type DeckSpec = { name: string; commander: Card }

const cmdr = (name: string, cost: string, cmc: number, colors: Color[]): Card =>
  ({ name, type: 'Legendary Creature', cost, cmc, colors, salt: 1.5 })

const DECKS: Record<string, DeckSpec[]> = {
  alex: [
    { name: 'Atraxa Superfriends', commander: cmdr("Atraxa, Praetors' Voice", '{G}{W}{U}{B}', 4, ['W', 'U', 'B', 'G']) },
    { name: 'Krenko Goblin Tide', commander: cmdr('Krenko, Mob Boss', '{2}{R}{R}', 4, ['R']) },
  ],
  jordan: [
    { name: 'Yuriko Ninjutsu', commander: cmdr("Yuriko, the Tiger's Shadow", '{1}{U}{B}', 3, ['U', 'B']) },
    { name: 'Kenrith Group Hug', commander: cmdr('Kenrith, the Returned King', '{4}{W}', 5, ['W', 'U', 'B', 'R', 'G']) },
  ],
  sam: [
    { name: 'Meren Recursion', commander: cmdr('Meren of Clan Nel Toth', '{2}{B}{G}', 4, ['B', 'G']) },
    { name: 'Edgar Markov Vampires', commander: cmdr('Edgar Markov', '{3}{R}{W}{B}', 6, ['W', 'B', 'R']) },
  ],
  priya: [
    { name: 'Lathril Elfball', commander: cmdr('Lathril, Blade of the Elves', '{2}{B}{G}', 4, ['B', 'G']) },
    { name: 'Niv-Mizzet Wheels', commander: cmdr('Niv-Mizzet, Parun', '{U}{U}{U}{R}{R}{R}', 6, ['U', 'R']) },
  ],
  kenji: [
    { name: 'Korvold Treasure Feast', commander: cmdr('Korvold, Fae-Cursed King', '{2}{B}{R}{G}', 5, ['B', 'R', 'G']) },
    { name: 'Miirym Dragon Copies', commander: cmdr('Miirym, Sentinel Wyrm', '{3}{G}{U}{R}', 6, ['U', 'R', 'G']) },
  ],
}

async function insertDeck(ownerUserId: string, spec: DeckSpec): Promise<string> {
  const identity = spec.commander.colors
  const spells = STAPLES.filter((c) => c.colors.every((col) => identity.includes(col)))
  const lands = identity.length > 0 ? identity : (['W'] as Color[])
  // Pad with basics so the list adds up to 100 cards, like a real Commander deck.
  const remaining = 100 - 1 - spells.length
  const perBasic = Math.floor(remaining / lands.length)

  const cards = [
    { card: spec.commander, isCommander: true, quantity: 1 },
    ...spells.map((card) => ({ card, isCommander: false, quantity: 1 })),
    ...lands.map((col, i) => ({
      card: { name: BASICS[col], type: 'Basic Land', cost: '', cmc: 0, colors: [], salt: 0 } satisfies Card,
      isCommander: false,
      quantity: perBasic + (i === 0 ? remaining - perBasic * lands.length : 0),
    })),
  ]

  const [created] = await db
    .insert(deck)
    .values({
      ownerUserId,
      name: spec.name,
      bracketEstimated: estimateBracket(spells.map((c) => c.salt)),
      colorIdentity: identity,
      // Demo decks aren't linked to Archidekt, but look like a recent import.
      lastSyncedAt: new Date(Date.now() - between(1, 20) * 24 * 60 * 60 * 1000),
    })
    .returning({ id: deck.id })
  if (!created) throw new Error(`Failed to insert deck ${spec.name}`)

  await db.insert(decklistCard).values(
    cards.map(({ card, isCommander, quantity }) => ({
      deckId: created.id,
      cardName: card.name,
      // Empty oracle id → card art is resolved by name via the Scryfall proxy.
      scryfallId: '',
      isCommander,
      quantity,
      cardType: card.type,
      manaCost: card.cost,
      cmc: card.cmc,
      saltScore: card.salt,
    })),
  )
  return created.id
}

// ── Users ────────────────────────────────────────────────────────────────────

type SeedUser = { key: string; name: string; email: string }

const USERS: SeedUser[] = [
  { key: 'alex', name: 'Alex', email: 'demo@example.com' },
  { key: 'jordan', name: 'Jordan', email: 'jordan@example.com' },
  { key: 'sam', name: 'Sam', email: 'sam@example.com' },
  { key: 'priya', name: 'Priya', email: 'priya@example.com' },
  { key: 'kenji', name: 'Kenji', email: 'kenji@example.com' },
]

async function createVerifiedUser(name: string, email: string): Promise<string> {
  // Mirrors Better Auth's email sign-up (hash → user → credential account) but
  // marks the email verified up front, so no verification mail is ever sent.
  const ctx = await auth.$context
  const hash = await ctx.password.hash(DEMO_PASSWORD)
  const user = await ctx.internalAdapter.createUser(
    { name, email, emailVerified: true },
    { method: 'email-password' },
  )
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  })
  return user.id
}

// ── Games ────────────────────────────────────────────────────────────────────

type Seat = { name: string; memberId: string | null; deckId: string; isGuest: boolean }

const TAKEAWAYS = [
  'That turn-three Rhystic Study tax was brutal.',
  'Should have swung at the Korvold player way earlier.',
  'Best politics game in weeks.',
  'Mana screwed until turn six, but the comeback was fun.',
  'Cyclonic Rift on the last turn, every time.',
  'Too long, but the ending was worth it.',
  'Combat math was spicy.',
  '',
  '',
  '',
]

function playSeats(seats: Seat[], forcedWinner: number | null, endReason: 'won' | 'abandoned') {
  const durationSec = between(45, 110) * 60
  const winnerIdx = forcedWinner ?? between(0, seats.length - 1)
  const causes: CreateGamePlayer['deathCause'][] = ['life', 'life', 'life', 'cmdr_dmg', 'poison', 'conceded']

  const losers = shuffle(seats.map((_, i) => i).filter((i) => i !== winnerIdx))
  const deathAtByIdx = new Map<number, number>()
  losers.forEach((idx, order) => {
    const share = (order + 1) / (losers.length + 1)
    deathAtByIdx.set(idx, Math.round(durationSec * share) + between(-120, 120))
  })

  return {
    durationSec,
    players: seats.map((s, i): CreateGamePlayer => {
      const abandoned = endReason === 'abandoned'
      const isWinner = !abandoned && i === winnerIdx
      const cause = abandoned || isWinner ? 'none' : pick(causes)
      const surveyed = rand() < 0.8
      return {
        name: s.name,
        isGuest: s.isGuest,
        memberId: s.memberId,
        deckId: s.deckId,
        finalLife: isWinner ? between(6, 31) : cause === 'life' ? between(-6, 0) : between(3, 24),
        poison: cause === 'poison' ? 10 : between(0, 3),
        deathCause: cause,
        deathAt: abandoned || isWinner ? null : (deathAtByIdx.get(i) ?? null),
        isWinner,
        surveyFun: surveyed ? between(3, 5) : null,
        surveyAgency: surveyed ? between(2, 5) : null,
        surveyTakeaway: surveyed ? pick(TAKEAWAYS) : '',
      }
    }),
  }
}

/** Moves a freshly created game (stamped "now") back to `startedAt`. */
async function backdate(gameId: string, startedAt: Date, durationSec: number) {
  const [row] = await db.select({ startedAt: game.startedAt }).from(game).where(eq(game.id, gameId))
  if (!row) return
  const shiftSec = Math.round((row.startedAt.getTime() - startedAt.getTime()) / 1000)
  await db
    .update(game)
    .set({ startedAt, endedAt: new Date(startedAt.getTime() + durationSec * 1000) })
    .where(eq(game.id, gameId))
  await db
    .update(gamePlayer)
    .set({ diedAt: sql`${gamePlayer.diedAt} - make_interval(secs => ${shiftSec})` })
    .where(eq(gamePlayer.gameId, gameId))
}

// ── Main ─────────────────────────────────────────────────────────────────────

// Local handle for the Better-Auth-managed table (not part of db/schema.ts).
const authUser = pgTable('user', { id: uuid('id').primaryKey(), email: text('email') })

const existing = await db.select({ id: authUser.id }).from(authUser).where(eq(authUser.email, 'demo@example.com'))
if (existing.length > 0) {
  console.log('[seed] demo data already present; run `pnpm db:reset && pnpm db:migrate` to start over')
  await pool.end()
  process.exit(0)
}

const userIds: Record<string, string> = {}
for (const u of USERS) userIds[u.key] = await createVerifiedUser(u.name, u.email)
const uid = (key: string) => userIds[key]!

const deckIds: Record<string, string[]> = {}
for (const [owner, specs] of Object.entries(DECKS)) {
  deckIds[owner] = []
  for (const spec of specs) deckIds[owner]!.push(await insertDeck(uid(owner), spec))
}

// Tuesday pod: Alex runs it, everyone else joins (which notifies Alex).
const tuesday = await createPlaygroup(db, uid('alex'), 'Alex', { name: 'Tuesday Night Commander' })
for (const u of USERS.filter((u) => u.key !== 'alex')) {
  await joinPlaygroup(db, uid(u.key), u.name, tuesday.inviteCode)
}
// A second, smaller pod so the playgroup switcher has something to switch to.
const office = await createPlaygroup(db, uid('jordan'), 'Jordan', { name: 'Lunch Break Brawl' })
await joinPlaygroup(db, uid('alex'), 'Alex', office.inviteCode)
await joinPlaygroup(db, uid('sam'), 'Sam', office.inviteCode)

async function memberIds(playgroupId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ id: playgroupMember.id, userId: playgroupMember.userId })
    .from(playgroupMember)
    .where(eq(playgroupMember.playgroupId, playgroupId))
  const byUser: Record<string, string> = {}
  for (const u of USERS) {
    const row = rows.find((r) => r.userId === userIds[u.key])
    if (row) byUser[u.key] = row.id
  }
  return byUser
}

const tuesdayMembers = await memberIds(tuesday.id)
const officeMembers = await memberIds(office.id)

function seatFor(key: string, members: Record<string, string>): Seat {
  return {
    name: USERS.find((u) => u.key === key)!.name,
    memberId: members[key]!,
    deckId: pick(deckIds[key]!),
    isGuest: false,
  }
}

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
let gameCount = 0

// Nine weeks of Tuesday nights, oldest first. The last three games go to Alex
// so the home screen shows a win streak.
const nights = 9
for (let week = nights - 1; week >= 0; week--) {
  const gamesTonight = week % 3 === 0 ? 2 : 1
  for (let g = 0; g < gamesTonight; g++) {
    const isLatest = week < 2
    const pool4 = isLatest
      ? ['alex', ...shuffle(['jordan', 'sam', 'priya', 'kenji']).slice(0, 3)]
      : shuffle(USERS.map((u) => u.key)).slice(0, 4)
    const seats = shuffle(pool4).map((k) => seatFor(k, tuesdayMembers))

    // Now and then a friend of a friend sits in as a guest.
    if (week === 4 || week === 7) {
      seats[3] = { name: 'Morgan', memberId: null, deckId: pick(deckIds.kenji!), isGuest: true }
    }

    const alexSeat = seats.findIndex((s) => s.name === 'Alex')
    const forced = isLatest && alexSeat >= 0 ? alexSeat : null
    const endReason = week === 5 && g === 0 ? 'abandoned' : 'won'
    const { durationSec, players } = playSeats(seats, forced, endReason)

    const id = await createGame(db, uid('alex'), {
      podId: tuesday.id,
      durationSec,
      endReason,
      players,
    })
    const startedAt = new Date(now - week * 7 * DAY - 3 * DAY + g * 2 * 60 * 60 * 1000)
    startedAt.setHours(19 + g * 2, between(0, 40), 0, 0)
    await backdate(id, startedAt, durationSec)
    gameCount++
  }
}

// A couple of lunch-break games in the second pod.
for (const daysAgo of [12, 5]) {
  const seats = shuffle(['alex', 'jordan', 'sam']).map((k) => seatFor(k, officeMembers))
  const { durationSec, players } = playSeats(seats, null, 'won')
  const id = await createGame(db, uid('jordan'), { podId: office.id, durationSec, endReason: 'won', players })
  const startedAt = new Date(now - daysAgo * DAY)
  startedAt.setHours(12, 10, 0, 0)
  await backdate(id, startedAt, durationSec)
  gameCount++
}

console.log(
  `[seed] created ${USERS.length} users, ${Object.values(deckIds).flat().length} decks, 2 playgroups, ${gameCount} games`,
)
console.log(`[seed] sign in with demo@example.com / ${DEMO_PASSWORD}`)
await pool.end()
