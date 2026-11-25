import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fixture, fromScript } from '../../engine/index.ts'
import {
  clearLog,
  forgetVoyage,
  LOG_KEY,
  loadLog,
  logCounts,
  logKey,
  logStats,
  recordVoyage,
  scenarioGrid,
  UNREADABLE_LOG_KEY,
  useCaptainsLog,
  voyageId,
  type VoyageRecord,
} from './history.ts'
import { loadLastSettings, saveLastSettings } from './lastSettings.ts'

beforeEach(() => localStorage.clear())

const DAY1 = '2026-11-19T20:00:00.000Z'
const DAY2 = '2026-11-20T20:00:00.000Z'

describe('recording a voyage in the captain’s log (design E3)', () => {
  it('logs a won voyage with its scenario, difficulty, reason and round', () => {
    const won = fixture('won')
    const log = recordVoyage(won, DAY1)
    expect(log).toEqual([
      {
        id: voyageId(won.settings, won.events),
        date: DAY1,
        settings: { scenario: won.settings.scenario, difficulty: won.settings.difficulty },
        outcome: 'won',
        reason: 'end',
        round: 1,
      },
    ])
    expect(loadLog()).toEqual(log)
  })

  it('logs a lost voyage with the engine’s reason', () => {
    expect(recordVoyage(fixture('lostStorm'), DAY1)[0]).toMatchObject({
      outcome: 'lost',
      reason: 'storm',
      round: 2,
    })
    expect(recordVoyage(fixture('lostPastEnd'), DAY1)[0]).toMatchObject({ reason: 'pastEnd' })
  })

  it('logs an ended voyage as unfinished, in the round it stopped (design D2)', () => {
    const log = recordVoyage(fromScript('x Y!*4 e d'), DAY1)
    expect(log[0]).toMatchObject({ outcome: 'unfinished', reason: null, round: 2 })
  })

  it('logs each voyage once, however often it is recorded (replaying a finished voyage)', () => {
    const won = fixture('won')
    recordVoyage(won, DAY1)
    recordVoyage({ ...won }, DAY2)
    expect(loadLog()).toHaveLength(1)
    expect(loadLog()[0]?.date).toBe(DAY1)
  })

  it('keeps two unfinished voyages that stopped at the same step apart', () => {
    const fresh = fromScript('')
    recordVoyage(fresh, DAY1)
    recordVoyage(fresh, DAY2)
    expect(loadLog().map((e) => e.date)).toEqual([DAY2, DAY1])
  })

  it('lists the newest first', () => {
    recordVoyage(fixture('won'), DAY1)
    recordVoyage(fixture('lostKrakenAlone'), DAY2)
    expect(loadLog().map((e) => e.outcome)).toEqual(['lost', 'won'])
  })

  it('forgets one voyage, and clears them all', () => {
    const won = fixture('won')
    recordVoyage(won, DAY1)
    recordVoyage(fixture('lostStorm'), DAY2)
    expect(forgetVoyage(voyageId(won.settings, won.events))).toHaveLength(1)
    clearLog()
    expect(loadLog()).toEqual([])
  })
})

describe('loading the log (Core → Saved data is a promise)', () => {
  it('lives under a versioned key', () => {
    recordVoyage(fixture('won'), DAY1)
    expect(LOG_KEY).toBe('bosun:v1:log')
    expect(JSON.parse(localStorage.getItem(LOG_KEY) ?? '')).toMatchObject({ version: 1 })
  })

  it('migrates an older version and moves it to the current key', () => {
    // A made-up version 1 whose entries kept the outcome under `result`, migrated to version 2.
    const old = {
      version: 1,
      entries: [
        {
          id: 'a',
          date: DAY1,
          settings: { scenario: 3, difficulty: 'hard' },
          result: 'won',
          reason: 'end',
          round: 4,
        },
      ],
    }
    localStorage.setItem(logKey(1), JSON.stringify(old))
    const migrations = {
      1: (v: Record<string, unknown>) => ({
        version: 2,
        entries: (v.entries as Record<string, unknown>[]).map(({ result, ...e }) => ({
          ...e,
          outcome: result,
        })),
      }),
    }
    const log = loadLog(localStorage, migrations, 2)
    expect(log).toEqual([
      {
        id: 'a',
        date: DAY1,
        settings: { scenario: 3, difficulty: 'hard' },
        outcome: 'won',
        reason: 'end',
        round: 4,
      },
    ])
    expect(localStorage.getItem(logKey(1))).toBeNull()
    expect(JSON.parse(localStorage.getItem(logKey(2)) ?? '')).toEqual({ version: 2, entries: log })
  })

  it('skips entries it can’t read and keeps the rest', () => {
    const good: VoyageRecord = {
      id: 'g',
      date: DAY1,
      settings: { scenario: 'learning', difficulty: 'easy' },
      outcome: 'lost',
      reason: 'skull',
      round: 3,
    }
    const bad = [{ ...good, round: 9 }, { ...good, reason: 'end' }, { ...good, date: 'soon' }, 7]
    localStorage.setItem(LOG_KEY, JSON.stringify({ version: 1, entries: [good, ...bad] }))
    expect(loadLog()).toEqual([good])
  })

  it('keeps a log it can’t parse aside instead of deleting it', () => {
    for (const raw of ['{not json', '[]', '{"version":7,"entries":[]}']) {
      localStorage.clear()
      localStorage.setItem(LOG_KEY, raw)
      expect(loadLog()).toEqual([])
      expect(localStorage.getItem(UNREADABLE_LOG_KEY)).toBe(raw)
    }
  })

  it('never throws when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    expect(loadLog(blocked)).toEqual([])
    expect(recordVoyage(fixture('won'), DAY1, blocked)).toHaveLength(1)
    expect(() => clearLog(blocked)).not.toThrow()
  })
})

describe('the log’s figures', () => {
  const entry = (
    scenario: VoyageRecord['settings']['scenario'],
    difficulty: VoyageRecord['settings']['difficulty'],
    outcome: VoyageRecord['outcome'],
    date = DAY1,
  ): VoyageRecord => ({
    id: `${scenario}${difficulty}${outcome}${date}`,
    date,
    settings: { scenario, difficulty },
    outcome,
    reason: outcome === 'won' ? 'end' : outcome === 'lost' ? 'storm' : null,
    round: 3,
  })

  it('counts voyages and landfalls for Home (design A2)', () => {
    expect(logCounts([])).toEqual({ voyages: 0, reachedLand: 0 })
    expect(
      logCounts([
        entry(1, 'easy', 'won'),
        entry(1, 'easy', 'lost'),
        entry(2, 'hard', 'unfinished'),
      ]),
    ).toEqual({ voyages: 3, reachedLand: 1 })
  })

  it('gives the win rate over every voyage and the first voyage’s date', () => {
    expect(logStats([])).toEqual({ voyages: 0, reachedLand: 0, winRate: null, since: null })
    const stats = logStats([entry(1, 'easy', 'won', DAY2), entry(1, 'easy', 'lost', DAY1)])
    expect(stats.winRate).toBe(0.5)
    expect(stats.since).toBe(DAY1)
  })

  it('fills the grid: Learning and 1 to 5, gold where land was reached, tries elsewhere', () => {
    const grid = scenarioGrid([
      entry(3, 'medium', 'lost'),
      entry(3, 'medium', 'won'),
      entry(3, 'hard', 'lost'),
      entry('learning', 'easy', 'unfinished'),
    ])
    expect(grid.map((r) => r.scenario)).toEqual(['learning', 1, 2, 3, 4, 5])
    expect(grid[3]?.cells).toEqual([
      { difficulty: 'easy', reached: false, tries: 0 },
      { difficulty: 'medium', reached: true, tries: 2 },
      { difficulty: 'hard', reached: false, tries: 1 },
    ])
    expect(grid[0]?.cells[0]).toEqual({ difficulty: 'easy', reached: false, tries: 1 })
  })
})

describe('useCaptainsLog', () => {
  it('records once, dated now, and clears', () => {
    const { result } = renderHook(() => useCaptainsLog())
    act(() => result.current.record(fixture('won')))
    act(() => result.current.record(fixture('won')))
    expect(result.current.entries).toHaveLength(1)
    expect(Date.parse(result.current.entries[0]?.date ?? '')).not.toBeNaN()
    act(() => result.current.clear())
    expect(result.current.entries).toEqual([])
    expect(loadLog()).toEqual([])
  })
})

describe('the last settings (Try scenario N again → setup)', () => {
  it('saves and loads them, and never throws on junk', () => {
    const { settings } = fixture('lostStorm')
    saveLastSettings(settings)
    expect(loadLastSettings()).toEqual(settings)
    localStorage.setItem('bosun:v1:last-settings', '{nope')
    expect(loadLastSettings()).toBeNull()
  })
})
