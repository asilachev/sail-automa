import { describe, expect, it } from 'vitest'
import { SCENARIOS, scenario } from './scenarios.ts'

const cell = /^[A-G]([1-9]|1[0-9]|2[0-5])$/

describe('the Scenario Book (docs/rules.md → Scenarios)', () => {
  it('has the Learning scenario and scenarios 1 to 5, in that order', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['learning', 1, 2, 3, 4, 5])
  })

  it('starts every scenario on D1 and labels every token with a board cell', () => {
    for (const s of SCENARIOS) {
      expect(s.start).toBe('D1')
      for (const c of [...s.islands, ...s.kraken, ...s.end]) expect(c, `${s.id} ${c}`).toMatch(cell)
    }
  })

  it('never puts two tokens on one cell', () => {
    for (const s of SCENARIOS) {
      const cells = [s.start, ...s.islands, ...s.kraken, ...s.end]
      expect(new Set(cells).size, String(s.id)).toBe(cells.length)
    }
  })

  it('has one storm in the Learning scenario and two in the others', () => {
    expect(scenario('learning').storms).toEqual([5])
    for (const id of [1, 2, 3, 4, 5] as const) expect(scenario(id).storms).toHaveLength(2)
  })

  it('puts three End tokens at the far end of the board', () => {
    for (const s of SCENARIOS) expect(s.end).toHaveLength(3)
  })
})
