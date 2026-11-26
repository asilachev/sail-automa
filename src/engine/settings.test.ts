import { describe, expect, it } from 'vitest'
import {
  CANNON_WHEEL,
  cannonWheelHolder,
  cannonWheelOptions,
  changedRulings,
  DEFAULT_RULINGS,
  DEFAULT_SETTINGS,
  parseSettings,
  RULING_KEYS,
  RULING_OPTIONS,
  type CannonWheel,
  type Difficulty,
} from './settings.ts'

describe('who holds the Cannon + Wheel pirate (docs/automa.md → Difficulty, #22)', () => {
  it('Easy: it is in the shared pair or not', () => {
    expect(cannonWheelOptions('easy')).toEqual(['none', 'shared'])
  })

  it('Medium: nobody, you or the Bosun', () => {
    expect(cannonWheelOptions('medium')).toEqual(['none', 'you', 'bosun'])
  })

  it('Hard: only you can hold it', () => {
    expect(cannonWheelOptions('hard')).toEqual(['none', 'you'])
  })

  it('reads a holder the difficulty doesn’t offer as its nearest one', () => {
    const holder = (difficulty: Difficulty, cannonWheel: CannonWheel) =>
      cannonWheelHolder({ ...DEFAULT_SETTINGS, difficulty, cannonWheel })
    expect(holder('easy', 'bosun')).toBe('shared')
    expect(holder('easy', 'you')).toBe('shared')
    expect(holder('easy', 'none')).toBe('none')
    expect(holder('medium', 'shared')).toBe('none')
    expect(holder('hard', 'bosun')).toBe('none')
    expect(holder('hard', 'shared')).toBe('none')
    expect(holder('hard', 'you')).toBe('you')
    expect(holder('medium', 'bosun')).toBe('bosun')
  })
})

describe('the rulings (docs/automa.md → Rulings)', () => {
  it('has the five rulings, in the table’s order', () => {
    expect(RULING_KEYS).toEqual([
      'pastEnd',
      'bosunPirate',
      'cannonWheel',
      'shortDeal',
      'fourthTrick',
    ])
  })

  it('defaults to the table’s defaults', () => {
    expect(DEFAULT_RULINGS).toEqual({
      pastEnd: 'lose',
      bosunPirate: 'you',
      cannonWheel: 'owner',
      shortDeal: 'evenly',
      fourthTrick: 'resolve',
    })
    for (const k of RULING_KEYS) expect(RULING_OPTIONS[k][0]).toBe(DEFAULT_RULINGS[k])
  })

  it('offers the alternatives the table lists', () => {
    expect(RULING_OPTIONS.pastEnd).toEqual(['lose', 'nothing'])
    expect(RULING_OPTIONS.bosunPirate).toEqual(['you'])
    expect(RULING_OPTIONS.cannonWheel).toEqual(['owner', 'anyWinner'])
    expect(RULING_OPTIONS.shortDeal).toEqual(['evenly'])
    expect(RULING_OPTIONS.fourthTrick).toEqual(['resolve', 'endFirst'])
  })

  it('counts the rulings changed from their defaults', () => {
    expect(changedRulings(DEFAULT_RULINGS)).toBe(0)
    expect(
      changedRulings({ ...DEFAULT_RULINGS, pastEnd: 'nothing', fourthTrick: 'endFirst' }),
    ).toBe(2)
  })
})

describe('settings from saved data', () => {
  it('reads valid settings back', () => {
    const s = { ...DEFAULT_SETTINGS, scenario: 3, difficulty: 'hard', seat: 'right' } as const
    expect(parseSettings(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('fills missing fields with their defaults, so older saves keep loading', () => {
    expect(parseSettings({ scenario: 2 })).toEqual({ ...DEFAULT_SETTINGS, scenario: 2 })
    expect(parseSettings({ scenario: 2, rulings: { pastEnd: 'nothing' } })?.rulings).toEqual({
      ...DEFAULT_RULINGS,
      pastEnd: 'nothing',
    })
  })

  it('migrates bosunCannonWheel from before #22: true is the Bosun, false is nobody', () => {
    expect(parseSettings({ scenario: 2, bosunCannonWheel: true })).toEqual({
      ...DEFAULT_SETTINGS,
      scenario: 2,
      cannonWheel: 'bosun',
    })
    expect(parseSettings({ scenario: 2, bosunCannonWheel: false })?.cannonWheel).toBe('none')
    expect(parseSettings({ scenario: 2, bosunCannonWheel: true })).not.toHaveProperty(
      'bosunCannonWheel',
    )
  })

  it('reads the Cannon + Wheel holder back for each value', () => {
    for (const cannonWheel of CANNON_WHEEL) {
      expect(parseSettings({ scenario: 1, cannonWheel })?.cannonWheel).toBe(cannonWheel)
    }
  })

  it('rejects unknown values', () => {
    expect(parseSettings(null)).toBeNull()
    expect(parseSettings({ scenario: 6 })).toBeNull()
    expect(parseSettings({ scenario: 1, difficulty: 'brutal' })).toBeNull()
    expect(parseSettings({ scenario: 1, bosunCannonWheel: 'yes' })).toBeNull()
    expect(parseSettings({ scenario: 1, cannonWheel: 'both' })).toBeNull()
    expect(parseSettings({ scenario: 1, rulings: { pastEnd: 'win' } })).toBeNull()
    expect(parseSettings({ scenario: 1, rulings: [] })).toBeNull()
  })
})
