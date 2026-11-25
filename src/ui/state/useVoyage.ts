import { useCallback, useRef, useState } from 'react'
import {
  loadVoyage,
  saveVoyage,
  VOYAGE_VERSION,
  type SavedVoyage,
  type VoyageAdapter,
} from './voyage.ts'

export interface VoyageApi<S, E> {
  /** The voyage in progress, or null when none is saved. */
  readonly voyage: SavedVoyage<S, E> | null
  /** A save was found but couldn't be read: Home says so (it was kept aside, not deleted). */
  readonly unreadable: boolean
  /** Starts a new voyage with no events. */
  start(settings: S): void
  /** Records one tap's event. */
  dispatch(event: E): void
  readonly canUndo: boolean
  /** Takes back the last event and returns it, for the Undone toast. */
  undo(): E | undefined
  /** Clears the saved voyage (ended or abandoned). */
  end(): void
}

/**
 * The voyage for the UI: settings plus events, saved after every change (design 00 → Never lose
 * a voyage). The state itself is the engine's replay of these, computed by the screens.
 */
export function useVoyage<S, E>(adapter: VoyageAdapter<S, E>): VoyageApi<S, E> {
  const [loaded] = useState(() => loadVoyage(adapter))
  const [voyage, setVoyage] = useState<SavedVoyage<S, E> | null>(loaded.voyage)
  // The latest voyage, so taps in quick succession each build on the one before.
  const current = useRef(voyage)

  const commit = useCallback((next: SavedVoyage<S, E> | null) => {
    current.current = next
    saveVoyage(next)
    setVoyage(next)
  }, [])

  const start = useCallback(
    (settings: S) => commit({ version: VOYAGE_VERSION, settings, events: [] }),
    [commit],
  )

  const dispatch = useCallback(
    (event: E) => {
      const v = current.current
      if (!v) throw new Error('No voyage in progress')
      commit({ ...v, events: [...v.events, event] })
    },
    [commit],
  )

  const undo = useCallback(() => {
    const v = current.current
    if (!v || v.events.length === 0) return undefined
    commit({ ...v, events: v.events.slice(0, -1) })
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
