import type { Settings, VoyageEvent, VoyageState } from '../../engine/index.ts'

/** A voyage as it ends: its settings, events and final state. */
export interface EndedVoyage {
  readonly settings: Settings
  readonly events: readonly VoyageEvent[]
  readonly state: VoyageState
}

type Listener = (voyage: EndedVoyage) => void
const listeners = new Set<Listener>()

/**
 * Called just before a voyage in progress is ended from the menu (D2 · End this voyage?), while
 * its save still exists. The captain's log (#8) listens here to write the voyage down as
 * unfinished; the game screen itself only clears the save.
 */
export function voyageEnded(voyage: EndedVoyage): void {
  for (const listener of listeners) listener(voyage)
}

/** Listens for voyages ended from the menu; returns the way to stop listening. */
export function onVoyageEnded(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
