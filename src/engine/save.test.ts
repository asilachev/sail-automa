import { describe, expect, it } from 'vitest'
import { fromScript } from './fixtures.ts'
import { loadSave, parseEvent, SAVE_VERSION, toSave } from './save.ts'
import { DEFAULT_SETTINGS } from './settings.ts'
import { currentStep } from './voyage.ts'

const fixTrackers = { type: 'fix', above: 4, below: 1, track: 1, playerDeck: 2 } as const

describe('saved voyages (AGENTS.md → A save stores the inputs)', () => {
  const { settings, events, state } = fromScript('x Bkh @k . Ycc fc fh @o . fix:4,1,1,2', {
    scenario: 3,
  })

  it('stores the version, the settings and the events', () => {
    expect(toSave(settings, events)).toEqual({ version: SAVE_VERSION, settings, events })
    expect(SAVE_VERSION).toBe(1)
  })

  it('loads a save by replaying it, from an object or its JSON', () => {
    const json = JSON.stringify(toSave(settings, events))
    expect(loadSave(json)?.state).toEqual(state)
    expect(loadSave(JSON.parse(json))?.events).toEqual(events)
  })

  it('returns null, never throws, on garbage', () => {
    for (const raw of [
      undefined,
      null,
      42,
      '',
      '{not json',
      [],
      {},
      { version: 2, settings, events },
      { version: SAVE_VERSION, settings: {}, events },
      { version: SAVE_VERSION, settings, events: 'x' },
      { version: SAVE_VERSION, settings, events: [{ type: 'jump' }] },
      { version: SAVE_VERSION, settings, events: [{ type: 'trick', winner: 'you' }] },
    ]) {
      expect(loadSave(raw), JSON.stringify(raw)).toBeNull()
    }
  })

  it('returns null for events the rules don’t allow', () => {
    expect(loadSave(toSave(DEFAULT_SETTINGS, [{ type: 'orderDone' }]))).toBeNull()
    const badFix = { type: 'fix', above: 0, below: 0, track: 0, playerDeck: 0 }
    expect(loadSave({ version: SAVE_VERSION, settings, events: [badFix] })).toBeNull()
  })

  it('keeps loading a save from before #22, with bosunCannonWheel', () => {
    const old = {
      version: SAVE_VERSION,
      settings: { scenario: 3, difficulty: 'medium', seat: 'left', bosunCannonWheel: true },
      events: [
        { type: 'exchange' },
        { type: 'trick', winner: 'bosun', yours: 'helm', bosuns: 'helm' },
      ],
    }
    const loaded = loadSave(JSON.stringify(old))
    expect(loaded?.settings.cannonWheel).toBe('bosun')
    const step = loaded && currentStep(loaded.state)
    expect(step?.kind === 'order' && step.order.pirate.swap).toBe(true)
  })

  it('keeps loading a save from before #31, whose fix has no round or tricks', () => {
    const narrow = { type: 'fix', above: 4, below: 1, track: 1, playerDeck: 2 }
    const old = { version: SAVE_VERSION, settings, events: [{ type: 'exchange' }, narrow] }
    const loaded = loadSave(old)
    expect(loaded?.events[1]).toEqual(narrow)
    expect(loaded?.state.round).toBe(1)
    expect(loaded?.state.kraken).toEqual({ above: 4, below: 1, track: 1 })
  })

  it('reads a fix with the round and the tricks (#31)', () => {
    const wide = { ...fixTrackers, round: 2, tricks: { you: 1, bosun: 0 } }
    expect(parseEvent({ ...wide, extra: 1 })).toEqual(wide)
    expect(parseEvent({ ...fixTrackers, round: 2 })).toBeNull()
    expect(parseEvent({ ...wide, tricks: { you: 1 } })).toBeNull()
    expect(parseEvent({ ...wide, round: 'III' })).toBeNull()
    const out = { version: SAVE_VERSION, settings, events: [{ ...wide, round: 6 }] }
    expect(loadSave(out)).toBeNull()
  })

  it('keeps only the known fields of an event', () => {
    expect(parseEvent({ type: 'exchange', extra: 1 })).toEqual({ type: 'exchange' })
    expect(parseEvent({ type: 'ship', onto: 'island' })).toBeNull()
    expect(parseEvent({ type: 'storm', passed: 'no' })).toBeNull()
    expect(parseEvent({ type: 'fix', above: 1.5, below: 0, track: 0, playerDeck: 0 })).toBeNull()
  })
})
