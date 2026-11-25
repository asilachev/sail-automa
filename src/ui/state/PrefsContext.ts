import { createContext, useContext } from 'react'
import { DEFAULT_PREFS, type Prefs } from './prefs.ts'

export interface PrefsApi {
  readonly prefs: Prefs
  /** Changes some preferences and saves them at once. */
  update(change: Partial<Prefs>): void
}

export const PrefsContext = createContext<PrefsApi>({ prefs: DEFAULT_PREFS, update: () => {} })

/** The device preferences (theme, language, wake lock) and a way to change them. */
export const usePrefs = (): PrefsApi => useContext(PrefsContext)
