import { describe, it, expect } from 'vitest'
import {
  toGsDeck,
  deckChoicesForSeat,
  isBorrowedDeck,
  type GsDeck,
  type GsMember,
  type GsSeat,
} from './game-setup'

const members: GsMember[] = [
  { id: 'ana', name: 'Ana', you: true },
  { id: 'cleo', name: 'Cleo' },
  { id: 'ben', name: 'Ben' },
]

function deck(id: string, owner: string, name: string): GsDeck {
  return { id, owner, name, colors: ['G'], bracket: 2 }
}

const decks: GsDeck[] = [
  deck('d-zada', 'ben', 'Zada'),
  deck('d-edgar', 'cleo', 'Edgar'),
  deck('d-yarok', 'ana', 'Yarok'),
  deck('d-krenko', 'ben', 'Krenko'),
  deck('d-atraxa', 'ana', 'Atraxa'),
]

function seatFor(playerId: string): GsSeat {
  return { playerId, isGuest: false, guestName: '', deckId: null }
}

const guestSeat: GsSeat = { playerId: null, isGuest: true, guestName: 'Gus', deckId: null }

const names = (ds: GsDeck[]) => ds.map(d => d.name)

describe('toGsDeck', () => {
  it('maps ownerMemberId to owner and colorIdentity to colors', () => {
    expect(toGsDeck({
      id: 'd-krenko', ownerMemberId: 'ben', name: 'Krenko', commander: 'Krenko, Mob Boss',
      colorIdentity: ['R'], bracket: 3,
    })).toEqual({ id: 'd-krenko', owner: 'ben', name: 'Krenko', commander: 'Krenko, Mob Boss', colors: ['R'], bracket: 3 })

    expect(toGsDeck({
      id: 'd-x', ownerMemberId: 'ana', name: 'X', commander: null, colorIdentity: [], bracket: 1,
    }).commander).toBeUndefined()
  })
})

describe('deckChoicesForSeat', () => {
  it("lists the seated player's own decks first, sorted by name", () => {
    const choices = deckChoicesForSeat(decks, members, seatFor('ana'))
    expect(names(choices.own)).toEqual(['Atraxa', 'Yarok'])
  })

  it("groups other members' decks by owner, sorted by owner then deck name", () => {
    const choices = deckChoicesForSeat(decks, members, seatFor('ana'))
    expect(choices.borrowed.map(g => [g.owner.name, names(g.decks)])).toEqual([
      ['Ben', ['Krenko', 'Zada']],
      ['Cleo', ['Edgar']],
    ])
  })

  it('includes decks of members who are not seated', () => {
    // Only Ben is at the table; Ana's and Cleo's decks are still on offer.
    const choices = deckChoicesForSeat(decks, members, seatFor('ben'))
    expect(names(choices.own)).toEqual(['Krenko', 'Zada'])
    expect(choices.borrowed.map(g => g.owner.id)).toEqual(['ana', 'cleo'])
  })

  it('gives a guest seat no own section and every pod deck as borrowed', () => {
    const choices = deckChoicesForSeat(decks, members, guestSeat)
    expect(choices.own).toEqual([])
    expect(choices.borrowed.map(g => [g.owner.name, names(g.decks)])).toEqual([
      ['Ana', ['Atraxa', 'Yarok']],
      ['Ben', ['Krenko', 'Zada']],
      ['Cleo', ['Edgar']],
    ])
  })

  it('drops decks whose owner is not in the pod member list', () => {
    const choices = deckChoicesForSeat([...decks, deck('d-ghost', 'gone', 'Ghost')], members, seatFor('ana'))
    const all = [...choices.own, ...choices.borrowed.flatMap(g => g.decks)]
    expect(names(all)).not.toContain('Ghost')
    expect(all).toHaveLength(decks.length)
  })
})

describe('isBorrowedDeck', () => {
  it("is true for another member's deck and for any deck on a guest seat, false for own deck or no deck", () => {
    const krenko = deck('d-krenko', 'ben', 'Krenko')
    expect(isBorrowedDeck(seatFor('ana'), krenko)).toBe(true)
    expect(isBorrowedDeck(guestSeat, krenko)).toBe(true)
    expect(isBorrowedDeck(seatFor('ben'), krenko)).toBe(false)
    expect(isBorrowedDeck(seatFor('ana'), undefined)).toBe(false)
  })
})
