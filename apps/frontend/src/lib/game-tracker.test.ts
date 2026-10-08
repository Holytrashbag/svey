import { describe, it, expect } from 'vitest'
import { applyCmdrDmg, autoDeath, CMDR_DMG_MAX, deathCauseKey, fmtClock, gridForCount, relDeath, type GtPlayer } from './game-tracker'

function player(overrides: Partial<GtPlayer> = {}): GtPlayer {
  return {
    seatIdx: 0,
    name: 'Ada',
    isYou: false,
    isGuest: false,
    deck: null,
    life: 40,
    poison: 0,
    cmdrDmg: {},
    dead: false,
    deathAt: null,
    deathCause: null,
    ...overrides,
  }
}

describe('autoDeath', () => {
  it('keeps a healthy player alive', () => {
    expect(autoDeath(player())).toBeNull()
  })

  it('kills at 0 life or below', () => {
    expect(autoDeath(player({ life: 1 }))).toBeNull()
    expect(autoDeath(player({ life: 0 }))).toBe('life')
    expect(autoDeath(player({ life: -7 }))).toBe('life')
  })

  it('kills at 10 poison', () => {
    expect(autoDeath(player({ poison: 9 }))).toBeNull()
    expect(autoDeath(player({ poison: 10 }))).toBe('poison')
  })

  it('kills at 21 damage from a single commander', () => {
    expect(autoDeath(player({ cmdrDmg: { 1: 20 } }))).toBeNull()
    expect(autoDeath(player({ cmdrDmg: { 1: 21 } }))).toBe('cmdr')
  })

  it('does not add commander damage across different commanders', () => {
    // 15 + 15 = 30 total, but no single commander reached 21.
    expect(autoDeath(player({ cmdrDmg: { 1: 15, 2: 15 } }))).toBeNull()
  })

  it('reports commander damage before life before poison when several apply', () => {
    expect(autoDeath(player({ life: 0, cmdrDmg: { 1: 21 } }))).toBe('cmdr')
    expect(autoDeath(player({ poison: 10, cmdrDmg: { 1: 21 } }))).toBe('cmdr')
    expect(autoDeath(player({ life: 0, poison: 10 }))).toBe('life')
    expect(autoDeath(player({ life: 0, poison: 10, cmdrDmg: { 1: 21 } }))).toBe('cmdr')
  })

  it('still reports poison at 10 when commander damage is below 21', () => {
    expect(autoDeath(player({ poison: 10, cmdrDmg: { 1: 20 } }))).toBe('poison')
  })

  it('never re-kills a player who is already dead', () => {
    expect(autoDeath(player({ dead: true, life: 0 }))).toBeNull()
  })
})

// Mirrors the merge updatePlayer does with the patch.
function apply(p: GtPlayer, attacker: number, dmg: number): GtPlayer {
  const patch = applyCmdrDmg(p, attacker, dmg)
  return { ...p, ...patch, cmdrDmg: { ...p.cmdrDmg, ...patch.cmdrDmg } }
}

describe('applyCmdrDmg', () => {
  it('adding commander damage lowers life by the same amount', () => {
    expect(applyCmdrDmg(player({ life: 40 }), 1, 3)).toEqual({ cmdrDmg: { 1: 3 }, life: 37 })
  })

  it('removing commander damage restores the same amount', () => {
    const p = player({ life: 35, cmdrDmg: { 1: 5 } })
    expect(applyCmdrDmg(p, 1, 2)).toEqual({ cmdrDmg: { 1: 2 }, life: 38 })
  })

  it('a bulk change moves life by the whole delta', () => {
    expect(applyCmdrDmg(player({ life: 40, cmdrDmg: { 1: 4 } }), 1, 11).life).toBe(33)
  })

  it('patches only the chosen attacker', () => {
    const p = player({ cmdrDmg: { 1: 4, 2: 6 } })
    expect(applyCmdrDmg(p, 2, 7).cmdrDmg).toEqual({ 2: 7 })
    expect(apply(p, 2, 7).cmdrDmg).toEqual({ 1: 4, 2: 7 })
  })

  it('clamped no-ops leave life alone', () => {
    expect(applyCmdrDmg(player({ life: 40, cmdrDmg: { 1: 0 } }), 1, -1).life).toBe(40)
    const max = player({ life: 40, cmdrDmg: { 1: CMDR_DMG_MAX } })
    expect(applyCmdrDmg(max, 1, CMDR_DMG_MAX + 1).life).toBe(40)
  })

  it('leaves poison unaffected', () => {
    expect(applyCmdrDmg(player({ poison: 7 }), 1, 3)).not.toHaveProperty('poison')
    expect(apply(player({ poison: 7 }), 1, 3).poison).toBe(7)
  })

  it('ignores changes on a dead player', () => {
    const dead = player({ dead: true, life: 0, cmdrDmg: { 1: 21 } })
    expect(applyCmdrDmg(dead, 1, 20)).toEqual({})
  })

  it('records cmdr when one hit reaches 21 and 0 life together', () => {
    const next = apply(player({ life: 1, cmdrDmg: { 1: 20 } }), 1, 21)
    expect(next.life).toBe(0)
    expect(autoDeath(next)).toBe('cmdr')
  })
})

describe('deathCauseKey', () => {
  it('maps each cause to its i18n key', () => {
    expect(deathCauseKey('cmdr')).toBe('game.deathCause.cmdr')
    expect(deathCauseKey('concede')).toBe('game.deathCause.concede')
  })

  it('falls back to a generic key without a cause', () => {
    expect(deathCauseKey(null)).toBe('game.deathCause.eliminated')
  })
})

describe('fmtClock', () => {
  it('formats seconds as mm:ss', () => {
    expect(fmtClock(0)).toBe('00:00')
    expect(fmtClock(65)).toBe('01:05')
    expect(fmtClock(3599)).toBe('59:59')
  })

  it('keeps counting minutes past an hour', () => {
    expect(fmtClock(3725)).toBe('62:05')
  })

  it('clamps negatives and drops fractions', () => {
    expect(fmtClock(-5)).toBe('00:00')
    expect(fmtClock(59.9)).toBe('00:59')
  })
})

describe('relDeath', () => {
  it('returns nothing for a living player', () => {
    expect(relDeath(null, 100)).toBeNull()
  })

  it('uses seconds under a minute, then whole minutes', () => {
    expect(relDeath(100, 130)).toEqual({ key: 'game.relDeath.secAgo', n: 30 })
    expect(relDeath(100, 160)).toEqual({ key: 'game.relDeath.minAgo', n: 1 })
    expect(relDeath(100, 400)).toEqual({ key: 'game.relDeath.minAgo', n: 5 })
  })
})

describe('gridForCount', () => {
  it('seats a single player alone and upright', () => {
    expect(gridForCount(1)).toEqual({ rows: [[0]], rotated: [false] })
  })

  it('splits a 4-player table 2 / 2 and rotates the top bank', () => {
    expect(gridForCount(4)).toEqual({
      rows: [[0, 1], [2, 3]],
      rotated: [true, true, false, false],
    })
  })

  it('puts the odd seat in the bottom bank', () => {
    const { rows, rotated } = gridForCount(5)
    expect(rows).toEqual([[0, 1], [2, 3, 4]])
    expect(rotated.filter(Boolean)).toHaveLength(2)
  })

  it('places every seat exactly once', () => {
    for (let n = 2; n <= 8; n++) {
      const seats = gridForCount(n).rows.flat().sort((a, b) => a - b)
      expect(seats).toEqual(Array.from({ length: n }, (_, i) => i))
    }
  })
})
