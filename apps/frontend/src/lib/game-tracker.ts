export type DeathCause = 'life' | 'cmdr' | 'poison' | 'manual' | 'concede'

export type GtPlayer = {
  seatIdx: number
  name: string
  isYou: boolean
  isGuest: boolean
  deck: { id: string; colors: string[]; commander: string } | null
  life: number
  poison: number
  cmdrDmg: Record<number, number>
  dead: boolean
  deathAt: number | null
  deathCause: DeathCause | null
}

export type GameSessionData = {
  podId: string
  startLife: number
  seats: Array<{
    playerId:      string | null
    playerName:    string
    isYou:         boolean
    isGuest:       boolean
    guestName:     string
    deckId:        string | null
    deckName:      string | null
    deckColors:    string[]
    deckCommander: string | null
  }>
}

export type GameResultData = {
  podId: string
  players: GtPlayer[]
  durationSec: number
  endReason: 'won' | 'draw' | 'abandoned'
  /** Reason ids picked when the game was retired early. */
  abandonReasons?: string[]
}

export const SESSION_KEY = 'svey:game-session'
export const RESULT_KEY = 'svey:game-result'

export const CMDR_DMG_MAX = 99

/**
 * Patch for setting one attacker's commander damage on `p`; life moves by the
 * opposite delta. `cmdrDmg` holds only the changed attacker, updatePlayer merges
 * it onto the existing record. Dead players are never changed (no revive).
 */
export function applyCmdrDmg(
  p: GtPlayer, attackerSeatIdx: number, dmg: number,
): Partial<Pick<GtPlayer, 'cmdrDmg' | 'life'>> {
  if (p.dead) return {}
  const prev = p.cmdrDmg[attackerSeatIdx] ?? 0
  const next = Math.min(CMDR_DMG_MAX, Math.max(0, Math.round(dmg)))
  return { cmdrDmg: { [attackerSeatIdx]: next }, life: p.life - (next - prev) }
}

export function autoDeath(p: GtPlayer): DeathCause | null {
  if (p.dead) return null
  const vals = Object.values(p.cmdrDmg)
  if (vals.length && Math.max(...vals) >= 21) return 'cmdr'
  if (p.life <= 0) return 'life'
  if (p.poison >= 10) return 'poison'
  return null
}

// Returns an i18n key under `game.deathCause.*`; callers wrap it with `t()`.
export function deathCauseKey(cause: DeathCause | null): string {
  const map: Record<DeathCause, string> = {
    life: 'game.deathCause.life',
    cmdr: 'game.deathCause.cmdr',
    poison: 'game.deathCause.poison',
    manual: 'game.deathCause.manual',
    concede: 'game.deathCause.concede',
  }
  return cause ? (map[cause] ?? 'game.deathCause.eliminated') : 'game.deathCause.eliminated'
}

export function fmtClock(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export type RelDeathToken = { key: 'game.relDeath.secAgo' | 'game.relDeath.minAgo'; n: number } | null

export function relDeath(deathAt: number | null, nowSec: number): RelDeathToken {
  if (deathAt == null) return null
  const diff = Math.max(0, nowSec - deathAt)
  if (diff < 60) return { key: 'game.relDeath.secAgo', n: diff }
  return { key: 'game.relDeath.minAgo', n: Math.floor(diff / 60) }
}

export function gridForCount(n: number): { rows: number[][]; rotated: boolean[] } {
  if (n <= 1) return { rows: [[0]], rotated: [false] }
  const half = Math.floor(n / 2)
  const top = Array.from({ length: half }, (_, i) => i)
  const bottom = Array.from({ length: n - half }, (_, i) => half + i)
  return {
    rows: [top, bottom],
    rotated: Array.from({ length: n }, (_, i) => i < half),
  }
}
