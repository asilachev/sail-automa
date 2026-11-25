import { createContext, useContext } from 'react'
import type { VoyageApi } from './useVoyage.ts'

const NO_VOYAGE: VoyageApi = {
  voyage: null,
  unreadable: false,
  start: () => {},
  dispatch: () => {},
  canUndo: false,
  undo: () => undefined,
  end: () => {},
}

/**
 * The one voyage the whole app shares: the shell calls `useVoyage()` once and provides it here,
 * so Home, the game and the menu all see the same saved voyage.
 */
export const VoyageContext = createContext<VoyageApi>(NO_VOYAGE)

export const useVoyageContext = (): VoyageApi => useContext(VoyageContext)
