import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { relativeTimeToken } from './time'

const NOW = new Date('2026-06-15T12:00:00Z')
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString()
}

describe('relativeTimeToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('handles a missing timestamp', () => {
    expect(relativeTimeToken(null)).toEqual({ key: 'time.never' })
  })

  it('treats anything under a minute as just now', () => {
    expect(relativeTimeToken(ago(0))).toEqual({ key: 'time.justNow' })
    expect(relativeTimeToken(ago(59_000))).toEqual({ key: 'time.justNow' })
  })

  it.each([
    [5 * MIN, { key: 'time.minAgo', n: 5 }],
    [59 * MIN, { key: 'time.minAgo', n: 59 }],
    [1 * HOUR, { key: 'time.hAgo', n: 1 }],
    [23 * HOUR, { key: 'time.hAgo', n: 23 }],
    [1 * DAY, { key: 'time.dAgo', n: 1 }],
    [6 * DAY, { key: 'time.dAgo', n: 6 }],
    [7 * DAY, { key: 'time.wAgo', n: 1 }],
    [27 * DAY, { key: 'time.wAgo', n: 3 }],
    [60 * DAY, { key: 'time.moAgo', n: 2 }],
    [400 * DAY, { key: 'time.yAgo', n: 1 }],
    // Bucket seams that used to render "0mo ago" / "0y ago".
    [28 * DAY, { key: 'time.moAgo', n: 1 }],
    [362 * DAY, { key: 'time.yAgo', n: 1 }],
  ])('buckets %i ms ago', (ms, expected) => {
    expect(relativeTimeToken(ago(ms))).toEqual(expected)
  })
})
