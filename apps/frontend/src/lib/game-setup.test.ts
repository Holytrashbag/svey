import { describe, it, expect } from 'vitest'
import {
  toGsDeck,
  deckChoicesForSeat,
  isBorrowedDeck,
  isSeatFilled,
  buildSessionSeats,
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

const blank: GsSeat = { playerId: null, isGuest: false, guestName: '', deckId: null }
const withDeck = (seat: GsSeat, deckId: string): GsSeat => ({ ...seat, deckId })

describe('isSeatFilled', () => {
  it('is false for a blank seat and true for a member or guest seat', () => {
    expect(isSeatFilled(blank)).toBe(false)
    expect(isSeatFilled(seatFor('ana'))).toBe(true)
    expect(isSeatFilled(guestSeat)).toBe(true)
  })
})

describe('buildSessionSeats', () => {
  const ana = withDeck(seatFor('ana'), 'd-atraxa')
  const ben = withDeck(seatFor('ben'), 'd-zada')
  const gus = withDeck(guestSeat, 'd-krenko')

  it('drops empty seats: 4 seats with 3 filled gives 3 session seats', () => {
    const out = buildSessionSeats([ana, blank, gus, ben], members, decks)
    expect(out).toHaveLength(3)
    expect(out.some(s => s.playerId === null && !s.isGuest)).toBe(false)
  })

  it('keeps the setup order of the filled seats', () => {
    const out = buildSessionSeats([blank, ben, blank, ana], members, decks)
    expect(out.map(s => s.playerId)).toEqual(['ben', 'ana'])
  })

  it('maps a member seat to name, isYou and deck details', () => {
    expect(buildSessionSeats([ana], members, decks)[0]).toEqual({
      playerId: 'ana', playerName: 'Ana', isYou: true, isGuest: false, guestName: '',
      deckId: 'd-atraxa', deckName: 'Atraxa', deckColors: ['G'], deckCommander: null,
    })
  })

  it('maps a guest seat with its guest name, no playerId and a borrowed deck', () => {
    expect(buildSessionSeats([gus], members, decks)[0]).toMatchObject({
      playerId: null, playerName: '', isYou: false, isGuest: true, guestName: 'Gus',
      deckId: 'd-krenko', deckName: 'Krenko',
    })
  })

  it('returns an empty list when every seat is empty', () => {
    expect(buildSessionSeats([blank, blank], members, decks)).toEqual([])
  })
})
