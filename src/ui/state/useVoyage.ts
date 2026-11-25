import { useCallback, useRef, useState } from 'react'
import {
  applyEvent,
  newVoyage,
  replay,
  undo as undoEvents,
  type Settings,
  type VoyageEvent,
  type VoyageState,
} from '../../engine/index.ts'
import { loadVoyage, saveVoyage } from './voyage.ts'

interface Current {
  readonly settings: Settings
  readonly events: readonly VoyageEvent[]
  readonly state: VoyageState
}

export interface VoyageApi {
  /** The voyage in progress: its settings, events and replayed state; null when none is saved. */
  readonly voyage: Current | null
  /** A save was found but couldn't be read: Home says so (it was kept aside, not deleted). */
  readonly unreadable: boolean
  /** Starts a new voyage with no events. */
  start(settings: Settings): void
  /** Records one tap's event. Throws the engine's VoyageRuleError, changing nothing, if illegal. */
  dispatch(event: VoyageEvent): void
  readonly canUndo: boolean
  /** Takes back the last tap (the engine's `undo`) and returns the event undone, for the toast. */
  undo(): VoyageEvent | undefined
  /** Clears the saved voyage (ended or abandoned). */
  end(): void
}

/**
 * The voyage for the UI: settings plus events, saved after every change (design 00 → Never lose
 * a voyage), with the engine's state alongside.
 */
export function useVoyage(): VoyageApi {
  const [loaded] = useState(() => loadVoyage())
  const [voyage, setVoyage] = useState<Current | null>(loaded.voyage)
  // The latest voyage, so taps in quick succession each build on the one before.
  const current = useRef(voyage)

  const commit = useCallback((next: Current | null) => {
    current.current = next
    saveVoyage(next)
    setVoyage(next)
  }, [])

  const start = useCallback(
    (settings: Settings) => commit({ settings, events: [], state: newVoyage(settings) }),
    [commit],
  )

  const dispatch = useCallback(
    (event: VoyageEvent) => {
      const v = current.current
      if (!v) throw new Error('No voyage in progress')
      const state = applyEvent(v.state, event)
      commit({ ...v, events: [...v.events, event], state })
    },
    [commit],
  )

  const undo = useCallback(() => {
    const v = current.current
    if (!v || v.events.length === 0) return undefined
    const events = undoEvents(v.events)
    commit({ settings: v.settings, events, state: replay(v.settings, events) })
    return v.events[v.events.length - 1]
  }, [commit])

  const end = useCallback(() => commit(null), [commit])

  return {
    voyage,
    unreadable: loaded.unreadable,
    start,
    dispatch,
    canUndo: (voyage?.events.length ?? 0) > 0,
    undo,
    end,
  }
}
