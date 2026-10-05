// Pure relative-time bucketing. String rendering (and localisation) is done by
// the `useFormat` composable via i18n; this stays dependency-free and testable.

export type RelativeTimeToken =
  | { key: "time.never" }
  | { key: "time.justNow" }
  | { key: "time.minAgo" | "time.hAgo" | "time.dAgo" | "time.wAgo" | "time.moAgo" | "time.yAgo"; n: number }

export function relativeTimeToken(iso: string | null): RelativeTimeToken {
  if (!iso) return { key: "time.never" }
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return { key: "time.justNow" }
  if (minutes < 60) return { key: "time.minAgo", n: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { key: "time.hAgo", n: hours }
  const days = Math.floor(hours / 24)
  if (days < 7) return { key: "time.dAgo", n: days }
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return { key: "time.wAgo", n: weeks }
  // Floor at 1: days 28-29 fall past the week bucket but short of 30 days,
  // and days 360-364 past 12 "months" but short of 365.
  const months = Math.max(1, Math.floor(days / 30))
  if (months < 12) return { key: "time.moAgo", n: months }
  const years = Math.max(1, Math.floor(days / 365))
  return { key: "time.yAgo", n: years }
}
