import { describe, expect, it } from 'vitest'
import { addBelow, attack, attacksAt, KRAKEN_START, krakenCards, TRACK } from './kraken.ts'

describe('the Kraken track (docs/rules.md → The Kraken track)', () => {
  it('runs 3, 3, 4, 5, skull, as the owner checked on the box', () => {
    expect(TRACK).toEqual([3, 3, 4, 5, 'skull'])
  })

  it('gives the attacks at round end as the number under the meeple', () => {
    expect([0, 1, 2, 3, 4].map((i) => attacksAt(i as 0 | 1 | 2 | 3 | 4))).toEqual([
      3,
      3,
      4,
      5,
      null,
    ])
  })
})

describe('the Kraken deck (docs/automa.md → The engine’s model)', () => {
  it('starts with the six 1s and 2s above the Kraken card', () => {
    expect(KRAKEN_START).toEqual({ above: 6, below: 0, track: 0 })
    expect(krakenCards(KRAKEN_START)).toBe(6)
  })

  it('an attack discards the top card from above', () => {
    expect(attack(KRAKEN_START, 1)).toEqual({
      deck: { above: 5, below: 0, track: 0 },
      effects: [{ kind: 'discard', above: 5, below: 0 }],
      lost: null,
    })
  })

  it('with none above, the Kraken card moves the meeple and goes to the bottom', () => {
    const r = attack({ above: 0, below: 3, track: 0 }, 1)
    expect(r.deck).toEqual({ above: 3, below: 0, track: 1 })
    expect(r.effects).toEqual([{ kind: 'krakenCard', track: 1, above: 3, below: 0 }])
    expect(r.lost).toBeNull()
  })

  it('moving the Kraken card uses up that attack; the rest go on (BGG clarification)', () => {
    const r = attack({ above: 1, below: 2, track: 0 }, 3)
    expect(r.effects.map((e) => e.kind)).toEqual(['discard', 'krakenCard', 'discard'])
    expect(r.deck).toEqual({ above: 1, below: 0, track: 1 })
  })

  it('loses when the Kraken card is the only card left', () => {
    const r = attack({ above: 2, below: 0, track: 0 }, 3)
    expect(r.lost).toBe('krakenAlone')
    expect(r.effects).toHaveLength(2)
  })

  it('loses when the meeple moves onto the skull', () => {
    const r = attack({ above: 0, below: 4, track: 3 }, 2)
    expect(r.lost).toBe('skull')
    expect(r.effects).toEqual([{ kind: 'krakenCard', track: 4, above: 4, below: 0 }])
  })

  it('puts a card added to the deck below the Kraken card', () => {
    expect(addBelow(KRAKEN_START, 2)).toEqual({ above: 6, below: 2, track: 0 })
  })
})
