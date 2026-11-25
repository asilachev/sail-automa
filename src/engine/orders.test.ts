import { describe, expect, it } from 'vitest'
import { CARD_SYMBOLS, cannonAction, pairAction, type CardSymbol } from './orders.ts'

describe('Actions (docs/rules.md → Actions, EN p.3)', () => {
  it('Helm + Helm moves the ship forward and toward the winner', () => {
    expect(pairAction('helm', 'helm')).toEqual({
      move: 'towardWinner',
      damage: 0,
      krakenHit: false,
      cannon: false,
    })
  })

  it('Helm & Kraken + Helm moves toward the winner and the Kraken damages the ship once', () => {
    expect(pairAction('helmKraken', 'helm')).toMatchObject({ move: 'towardWinner', damage: 1 })
  })

  it('Helm & Kraken + Helm & Kraken moves toward the winner and damages the ship twice', () => {
    expect(pairAction('helmKraken', 'helmKraken')).toMatchObject({
      move: 'towardWinner',
      damage: 2,
    })
  })

  it('Helm & Kraken + Cannon damages the Kraken: the card goes under the Kraken deck', () => {
    expect(pairAction('helmKraken', 'cannon')).toEqual({
      move: 'none',
      damage: 0,
      krakenHit: true,
      cannon: false,
    })
  })

  it('Tail + Tail moves the ship straight forward one space', () => {
    expect(pairAction('tail', 'tail')).toMatchObject({ move: 'straight', damage: 0 })
  })

  it('Cannon + Cannon flips the top card of the player deck', () => {
    expect(pairAction('cannon', 'cannon')).toMatchObject({ move: 'none', cannon: true })
  })

  it('any other pair has no action and no damage', () => {
    const others: [CardSymbol, CardSymbol][] = [
      ['helm', 'tail'],
      ['helm', 'cannon'],
      ['helmKraken', 'tail'],
      ['tail', 'cannon'],
    ]
    for (const [a, b] of others) {
      expect(pairAction(a, b), `${a}+${b}`).toEqual({
        move: 'none',
        damage: 0,
        krakenHit: false,
        cannon: false,
      })
    }
  })

  it('reads a pair in either order', () => {
    for (const a of CARD_SYMBOLS)
      for (const b of CARD_SYMBOLS) {
        expect(pairAction(a, b)).toEqual(pairAction(b, a))
      }
  })
})

describe('Cannon actions (docs/rules.md → Cannon actions, EN p.4)', () => {
  it('a flipped Helm moves the ship forward and toward the winner', () => {
    expect(cannonAction('helm')).toEqual({
      move: 'towardWinner',
      toKrakenDeck: false,
      again: false,
    })
  })

  it('a flipped Helm & Kraken goes to the bottom of the Kraken deck', () => {
    expect(cannonAction('helmKraken')).toEqual({ move: 'none', toKrakenDeck: true, again: false })
  })

  it('a flipped Tail moves the ship straight forward one space', () => {
    expect(cannonAction('tail')).toEqual({ move: 'straight', toKrakenDeck: false, again: false })
  })

  it('a flipped Cannon flips another card', () => {
    expect(cannonAction('cannon')).toEqual({ move: 'none', toKrakenDeck: false, again: true })
  })
})
