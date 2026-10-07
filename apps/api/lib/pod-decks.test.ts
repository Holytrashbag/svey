import { test } from 'node:test'
import assert from 'node:assert'
import { AppError } from './errors.ts'
import {
  assertActivePodMember,
  assertDecksInPod,
  buildPodDecks,
  type PodDeckRow,
  type PodMemberRow,
} from './pod-decks.ts'

const members: PodMemberRow[] = [
  { id: 'm-ana', userId: 'u-ana', isPending: false },
  { id: 'm-ben', userId: 'u-ben', isPending: false },
  { id: 'm-pending', userId: 'u-pending', isPending: true },
  { id: 'm-invite', userId: null, isPending: true },
  { id: 'm-noacct', userId: null, isPending: false },
]

function deckRow(id: string, ownerUserId: string, over: Partial<PodDeckRow> = {}): PodDeckRow {
  return {
    id,
    ownerUserId,
    name: id,
    colorIdentity: ['G'],
    bracketEstimated: 2,
    bracketOverride: null,
    isArchived: false,
    ...over,
  }
}

function isAppError(status: number, code: string) {
  return (err: unknown) => err instanceof AppError && err.statusCode === status && err.code === code
}

// ── assertActivePodMember ─────────────────────────────────────────────────────

test('assertActivePodMember passes for an accepted member with that userId', () => {
  assert.doesNotThrow(() => assertActivePodMember(members, 'u-ana'))
})

test('assertActivePodMember throws 403 FORBIDDEN for a pending member', () => {
  assert.throws(() => assertActivePodMember(members, 'u-pending'), isAppError(403, 'FORBIDDEN'))
})

test('assertActivePodMember throws 403 FORBIDDEN for a user with no row in the pod', () => {
  assert.throws(() => assertActivePodMember(members, 'u-stranger'), isAppError(403, 'FORBIDDEN'))
})

test('assertActivePodMember never matches rows with a null userId', () => {
  const noAccountOnly: PodMemberRow[] = [{ id: 'm-noacct', userId: null, isPending: false }]
  assert.throws(() => assertActivePodMember(noAccountOnly, ''), isAppError(403, 'FORBIDDEN'))
})

// ── buildPodDecks ─────────────────────────────────────────────────────────────

test('buildPodDecks maps each deck owner to their pod member id', () => {
  const decks = buildPodDecks(members, [deckRow('d-ana', 'u-ana'), deckRow('d-ben', 'u-ben')], [])
  assert.deepStrictEqual(
    decks.map((d) => [d.id, d.ownerMemberId]),
    [['d-ana', 'm-ana'], ['d-ben', 'm-ben']],
  )
})

test('buildPodDecks drops archived decks and decks of pending or non-members', () => {
  const decks = buildPodDecks(
    members,
    [
      deckRow('d-ana', 'u-ana'),
      deckRow('d-archived', 'u-ana', { isArchived: true }),
      deckRow('d-pending', 'u-pending'),
      deckRow('d-stranger', 'u-stranger'),
    ],
    [],
  )
  assert.deepStrictEqual(decks.map((d) => d.id), ['d-ana'])
})

test('buildPodDecks prefers bracketOverride and attaches the commander or null', () => {
  const decks = buildPodDecks(
    members,
    [
      deckRow('d-1', 'u-ana', { name: 'Elves', colorIdentity: ['G', 'B'], bracketOverride: 4 }),
      deckRow('d-2', 'u-ben', { colorIdentity: null, bracketEstimated: 3 }),
    ],
    [{ deckId: 'd-1', cardName: 'Lathril, Blade of the Elves' }],
  )
  assert.deepStrictEqual(decks, [
    {
      id: 'd-1',
      ownerMemberId: 'm-ana',
      name: 'Elves',
      commander: 'Lathril, Blade of the Elves',
      colorIdentity: ['G', 'B'],
      bracket: 4,
    },
    { id: 'd-2', ownerMemberId: 'm-ben', name: 'd-2', commander: null, colorIdentity: [], bracket: 3 },
  ])
})

// ── assertDecksInPod ──────────────────────────────────────────────────────────

test('assertDecksInPod passes when every deck belongs to an active member', () => {
  const decks = [{ id: 'd-ana', ownerUserId: 'u-ana' }, { id: 'd-ben', ownerUserId: 'u-ben' }]
  assert.doesNotThrow(() => assertDecksInPod(['d-ana', 'd-ben'], decks, members))
})

test('assertDecksInPod throws 400 BAD_REQUEST for a deck owned by a non-member', () => {
  const decks = [{ id: 'd-ana', ownerUserId: 'u-ana' }, { id: 'd-x', ownerUserId: 'u-stranger' }]
  assert.throws(() => assertDecksInPod(['d-ana', 'd-x'], decks, members), isAppError(400, 'BAD_REQUEST'))
})

test('assertDecksInPod throws 400 BAD_REQUEST for a deck owned by a pending member', () => {
  const decks = [{ id: 'd-p', ownerUserId: 'u-pending' }]
  assert.throws(() => assertDecksInPod(['d-p'], decks, members), isAppError(400, 'BAD_REQUEST'))
})

test('assertDecksInPod throws 400 BAD_REQUEST for an unknown deck id', () => {
  const decks = [{ id: 'd-ana', ownerUserId: 'u-ana' }]
  assert.throws(() => assertDecksInPod(['d-ana', 'd-gone'], decks, members), isAppError(400, 'BAD_REQUEST'))
})

test("assertDecksInPod accepts a member's archived deck and duplicate ids", () => {
  // Deck rows carry no archive flag: archive state is deliberately not checked.
  const decks = [{ id: 'd-ana', ownerUserId: 'u-ana' }]
  assert.doesNotThrow(() => assertDecksInPod(['d-ana', 'd-ana'], decks, members))
})
