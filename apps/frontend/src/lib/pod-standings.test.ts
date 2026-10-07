import { describe, it, expect } from 'vitest'
import { sortStandings, formatWinRate } from './pod-standings'

type Row = { name: string; wins: number; gamesPlayed: number; winRate: number | null }

const row = (name: string, wins: number, gamesPlayed: number, winRate: number | null): Row =>
  ({ name, wins, gamesPlayed, winRate })

describe('sortStandings', () => {
  it('ranks by win rate, not raw wins', () => {
    const ana = row('Ana', 3, 4, 75)
    const ben = row('Ben', 4, 10, 40)
    expect(sortStandings([ben, ana]).map(m => m.name)).toEqual(['Ana', 'Ben'])
  })

  it('puts members without games last', () => {
    const cleo = row('Cleo', 0, 0, null)
    const dan  = row('Dan', 0, 5, 0)
    const ana  = row('Ana', 3, 4, 75)
    expect(sortStandings([cleo, dan, ana]).map(m => m.name)).toEqual(['Ana', 'Dan', 'Cleo'])
  })

  it('breaks win-rate ties by wins, then games played, then name', () => {
    const members = [
      row('Zoe', 1, 2, 50),
      row('Eve', 2, 4, 50),
      row('Bob', 1, 2, 50),
      row('Max', 2, 4, 50),
    ]
    expect(sortStandings(members).map(m => m.name)).toEqual(['Eve', 'Max', 'Bob', 'Zoe'])
  })

  it('does not mutate its input', () => {
    const members = [row('Ben', 4, 10, 40), row('Ana', 3, 4, 75)]
    const copy = [...members]
    sortStandings(members)
    expect(members).toEqual(copy)
  })
})

describe('formatWinRate', () => {
  it('shows a dash for unknown, otherwise a percentage', () => {
    expect(formatWinRate(null)).toBe('—')
    expect(formatWinRate(0)).toBe('0%')
    expect(formatWinRate(75)).toBe('75%')
  })
})
