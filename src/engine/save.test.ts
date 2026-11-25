import { describe, expect, it } from 'vitest'
import { fromScript } from './fixtures.ts'
import { loadSave, parseEvent, SAVE_VERSION, toSave } from './save.ts'
import { DEFAULT_SETTINGS } from './settings.ts'

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

  it('keeps only the known fields of an event', () => {
    expect(parseEvent({ type: 'exchange', extra: 1 })).toEqual({ type: 'exchange' })
    expect(parseEvent({ type: 'ship', onto: 'island' })).toBeNull()
    expect(parseEvent({ type: 'storm', passed: 'no' })).toBeNull()
    expect(parseEvent({ type: 'fix', above: 1.5, below: 0, track: 0, playerDeck: 0 })).toBeNull()
  })
})
