import { test } from 'node:test'
import assert from 'node:assert'
import { sortPodsByRecentActivity, type OrderablePod } from './pod-order.ts'

function pod(id: string, name: string, lastPlayed: string | null): OrderablePod {
  return { id, name, lastPlayed }
}

const ids = (pods: OrderablePod[]) => pods.map(p => p.id)

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest]),
  )
}

test('sortPodsByRecentActivity puts the most recently played pod first', () => {
  const old = pod('old', 'Old pod', '2026-09-01T18:00:00.000Z')
  const recent = pod('recent', 'Recent pod', '2026-10-08T19:30:00.000Z')
  const middle = pod('middle', 'Middle pod', '2026-09-20T20:00:00.000Z')
  assert.deepStrictEqual(ids(sortPodsByRecentActivity([old, recent, middle])), ['recent', 'middle', 'old'])
})

test('sortPodsByRecentActivity compares instants, not strings, across UTC offsets', () => {
  // 20:00+02:00 is 18:00Z, earlier than 19:00Z although it sorts later as a string
  const shifted = pod('shifted', 'Shifted', '2026-10-08T20:00:00+02:00')
  const utc = pod('utc', 'Utc', '2026-10-08T19:00:00.000Z')
  assert.deepStrictEqual(ids(sortPodsByRecentActivity([shifted, utc])), ['utc', 'shifted'])
})

test('sortPodsByRecentActivity puts never-played pods after every played pod', () => {
  const fresh = pod('fresh', 'Aardvarks', null)
  const ancient = pod('ancient', 'Zebras', '2020-01-01T00:00:00.000Z')
  const recent = pod('recent', 'Middle', '2026-10-08T19:00:00.000Z')
  assert.deepStrictEqual(ids(sortPodsByRecentActivity([fresh, ancient, recent])), ['recent', 'ancient', 'fresh'])
})

test('sortPodsByRecentActivity orders never-played pods by name, case-insensitively', () => {
  const pods = [pod('c', 'cube night', null), pod('b', 'Brawl', null), pod('a', 'arena', null)]
  assert.deepStrictEqual(ids(sortPodsByRecentActivity(pods)), ['a', 'b', 'c'])
})

test('sortPodsByRecentActivity breaks equal timestamps by name, then id', () => {
  const at = '2026-10-08T19:00:00.000Z'
  const pods = [pod('id-2', 'Same', at), pod('id-3', 'Other', at), pod('id-1', 'Same', at)]
  assert.deepStrictEqual(ids(sortPodsByRecentActivity(pods)), ['id-3', 'id-1', 'id-2'])
})

test('sortPodsByRecentActivity gives the same result for every input permutation', () => {
  const pods = [
    pod('p1', 'Tuesday', '2026-10-01T18:00:00.000Z'),
    pod('p2', 'Lunch', '2026-10-05T12:00:00.000Z'),
    pod('p3', 'beta', null),
    pod('p4', 'Alpha', null),
    pod('p5', 'Same', null),
    pod('p6', 'Same', null),
  ]
  const expected = ['p2', 'p1', 'p4', 'p3', 'p5', 'p6']
  for (const order of permutations(pods)) {
    assert.deepStrictEqual(ids(sortPodsByRecentActivity(order)), expected)
  }
})

test('sortPodsByRecentActivity does not mutate its input', () => {
  const pods = [pod('a', 'A', null), pod('b', 'B', '2026-10-08T19:00:00.000Z')]
  const snapshot = structuredClone(pods)
  const sorted = sortPodsByRecentActivity(pods)
  assert.deepStrictEqual(pods, snapshot)
  assert.notStrictEqual(sorted, pods)
})

test('sortPodsByRecentActivity handles empty and single-item lists', () => {
  assert.deepStrictEqual(sortPodsByRecentActivity([]), [])
  const only = pod('only', 'Only', null)
  assert.deepStrictEqual(sortPodsByRecentActivity([only]), [only])
})
