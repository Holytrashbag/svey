import { describe, it, expect } from 'vitest'
import { retireReasonKeys } from './game-recap'

describe('retireReasonKeys', () => {
  it('maps known ids to their retire label keys in stored order', () => {
    expect(retireReasonKeys(['other', 'time'])).toEqual([
      'game.endReasons.retire.reasons.other.label',
      'game.endReasons.retire.reasons.time.label',
    ])
  })

  it('drops unknown ids and duplicates', () => {
    expect(retireReasonKeys(['time', 'mulligan', 'time', '__proto__', 'vibe'])).toEqual([
      'game.endReasons.retire.reasons.time.label',
      'game.endReasons.retire.reasons.vibe.label',
    ])
  })
})
