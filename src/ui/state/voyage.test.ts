import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, fromScript, replay, SAVE_VERSION, toSave } from '../../engine/index.ts'
import { useVoyage } from './useVoyage.ts'
import { loadVoyage, migrate, saveVoyage, UNREADABLE_KEY, VOYAGE_KEY, voyageKey } from './voyage.ts'

beforeEach(() => localStorage.clear())

const { settings, events, state } = fromScript('x Bkh @k . Ycc fc fh @o', { scenario: 3 })

describe('saving the voyage (PWA checklist → Never lose a voyage)', () => {
  it('saves the settings and events under a versioned key', () => {
    saveVoyage({ settings, events })
    expect(VOYAGE_KEY).toBe(`bosun:v${SAVE_VERSION}:voyage`)
    expect(JSON.parse(localStorage.getItem(VOYAGE_KEY) ?? '')).toEqual(toSave(settings, events))
  })

  it('loads it back by replaying it', () => {
    saveVoyage({ settings, events })
    const { voyage, unreadable } = loadVoyage()
    expect(unreadable).toBe(false)
    expect(voyage?.events).toEqual(events)
    expect(voyage?.state).toEqual(state)
  })

  it('finds nothing when nothing is saved', () => {
    expect(loadVoyage()).toEqual({ voyage: null, unreadable: false })
  })

  it('keeps an unreadable save aside instead of deleting it (Core → Saved data is a promise)', () => {
    for (const raw of ['{not json', '{"version":1,"settings":{},"events":[]}', '"x"']) {
      localStorage.clear()
      localStorage.setItem(VOYAGE_KEY, raw)
      expect(loadVoyage()).toEqual({ voyage: null, unreadable: true })
      expect(localStorage.getItem(UNREADABLE_KEY)).toBe(raw)
      expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
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
    expect(loadVoyage(blocked)).toEqual({ voyage: null, unreadable: false })
    expect(() => saveVoyage({ settings, events }, blocked)).not.toThrow()
  })

  it('clears the save when the voyage ends', () => {
    saveVoyage({ settings, events })
    saveVoyage(null)
    expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
  })
})

describe('migrations', () => {
  it('step an old save up to the current version', () => {
    const steps = {
      1: (old: Record<string, unknown>) => ({ ...old, version: 2, added: true }),
      2: (old: Record<string, unknown>) => ({ ...old, version: 3 }),
    }
    expect(migrate({ version: 1, events: [] }, steps, 3)).toEqual({
      version: 3,
      events: [],
      added: true,
    })
  })

  it('refuse a save from a newer version or with no way forward', () => {
    expect(() => migrate({ version: 9 }, {}, 1)).toThrow()
    expect(() => migrate({ version: 1 }, {}, 2)).toThrow()
    expect(() => migrate(null)).toThrow()
  })

  it('read the current version without change', () => {
    const save = toSave(settings, events)
    expect(migrate(JSON.parse(JSON.stringify(save)))).toEqual(save)
    expect(voyageKey(1)).toBe('bosun:v1:voyage')
  })
})

describe('useVoyage', () => {
  it('saves after every tap and undoes the last one', () => {
    const { result } = renderHook(() => useVoyage())
    expect(result.current.voyage).toBeNull()
    act(() => result.current.start(DEFAULT_SETTINGS))
    expect(loadVoyage().voyage?.events).toEqual([])
    act(() => result.current.dispatch({ type: 'exchange' }))
    expect(result.current.canUndo).toBe(true)
    expect(loadVoyage().voyage?.events).toEqual([{ type: 'exchange' }])
    expect(result.current.voyage?.state).toEqual(replay(DEFAULT_SETTINGS, [{ type: 'exchange' }]))

    let undone
    act(() => {
      undone = result.current.undo()
    })
    expect(undone).toEqual({ type: 'exchange' })
    expect(loadVoyage().voyage?.events).toEqual([])
    expect(result.current.canUndo).toBe(false)
  })

  it('reopens the saved voyage on the next launch, and ending clears it', () => {
    saveVoyage({ settings, events })
    const { result } = renderHook(() => useVoyage())
    expect(result.current.voyage?.state).toEqual(state)
    act(() => result.current.end())
    expect(result.current.voyage).toBeNull()
    expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
  })

  it('reports an unreadable save', () => {
    localStorage.setItem(VOYAGE_KEY, 'garbage')
    const { result } = renderHook(() => useVoyage())
    expect(result.current.unreadable).toBe(true)
    expect(result.current.voyage).toBeNull()
  })

  it('changes nothing when the rules refuse a tap', () => {
    const { result } = renderHook(() => useVoyage())
    act(() => result.current.start(DEFAULT_SETTINGS))
    expect(() => result.current.dispatch({ type: 'orderDone' })).toThrow()
    expect(result.current.voyage?.events).toEqual([])
    expect(loadVoyage().voyage?.events).toEqual([])
  })
})
