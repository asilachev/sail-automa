import { describe, expect, it } from 'vitest'
import { fixture, FIXTURES, fromScript, parseScript, type FixtureName } from './fixtures.ts'
import { currentStep } from './voyage.ts'

describe('fixtures: any state from a script', () => {
  it('parses each token into its events', () => {
    expect(parseScript('x Ykc fh @k . s+ s- e d fix:1,2,3,4')).toEqual([
      { type: 'exchange' },
      { type: 'trick', winner: 'you', yours: 'helmKraken', bosuns: 'cannon' },
      { type: 'flip', symbol: 'helm' },
      { type: 'ship', onto: 'kraken' },
      { type: 'orderDone' },
      { type: 'storm', passed: true },
      { type: 'storm', passed: false },
      { type: 'roundEndDone' },
      { type: 'dealt' },
      { type: 'fix', above: 1, below: 2, track: 3, playerDeck: 4 },
    ])
  })

  it('expands quiet tricks and repeats', () => {
    expect(parseScript('B!*2')).toEqual([
      { type: 'trick', winner: 'bosun', yours: 'tail', bosuns: 'cannon' },
      { type: 'orderDone' },
      { type: 'trick', winner: 'bosun', yours: 'tail', bosuns: 'cannon' },
      { type: 'orderDone' },
    ])
  })

  it('throws on an unknown token', () => {
    expect(() => parseScript('x Yzz')).toThrow()
    expect(() => parseScript('Y!*0')).toThrow()
  })

  it('takes settings over the defaults', () => {
    expect(fromScript('', { scenario: 5 }).settings.scenario).toBe(5)
  })

  it('reaches the step each named fixture is for', () => {
    const expected: Record<FixtureName, string> = {
      exchange: 'exchange',
      trickYouLead: 'trick',
      trickBosunLeads: 'trick',
      orderMove: 'order',
      orderAttack: 'order',
      orderKrakenHit: 'order',
      cannonFlip: 'order',
      cannonTail: 'order',
      bosunCannonWheel: 'order',
      roundEnd: 'roundEnd',
      roundEndStorm: 'roundEnd',
      deal: 'deal',
      won: 'won',
      lostKrakenAlone: 'lost',
      lostStorm: 'lost',
      lostPastEnd: 'lost',
      fixed: 'trick',
    }
    for (const name of Object.keys(FIXTURES) as FixtureName[]) {
      expect(currentStep(fixture(name).state).kind, name).toBe(expected[name])
    }
    const storm = currentStep(fixture('roundEndStorm').state)
    expect(storm).toMatchObject({ kind: 'roundEnd', round: 2, storm: { column: 5, passed: null } })
  })
})
