import { describe, expect, it } from 'vitest'
import { fixture, fromScript } from '../../engine/index.ts'
import { ROUND_III_TRICK_5 } from '../../test/app.tsx'
import { voyageSummary } from './summary.ts'

describe("Home's saved-voyage summary (design A3)", () => {
  it('names the scenario, difficulty, round, trick, tricks and the Kraken from the state', () => {
    const { state } = fromScript(ROUND_III_TRICK_5, { scenario: 3, difficulty: 'medium' })
    expect(voyageSummary(state)).toEqual({
      scenario: 3,
      difficulty: 'medium',
      round: 3,
      trick: 5,
      tricks: { you: 2, bosun: 2 },
      kraken: { above: 3, below: 1, cards: 4 },
      attacks: 4,
    })
  })

  it('counts the exchange as before trick 1', () => {
    expect(voyageSummary(fixture('exchange').state).trick).toBe(1)
  })

  it('keeps the trick of an order still being carried out', () => {
    expect(voyageSummary(fixture('orderMove').state).trick).toBe(1)
  })

  it('shows the last trick played once the round is over', () => {
    expect(voyageSummary(fixture('roundEnd').state).trick).toBe(4)
  })
})
