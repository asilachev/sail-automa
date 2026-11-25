import { createContext, useContext } from 'react'

export interface InstallApi {
  /** The app can be installed here: Chrome offered its prompt, or Safari on an iPhone or iPad. */
  readonly canInstall: boolean
  /** Shows Chrome's prompt, or on iOS the steps (F1). */
  install(): void
}

export const InstallContext = createContext<InstallApi>({ canInstall: false, install: () => {} })

/** The install card on Home and the row in Settings (design 00 → PWA checklist → Install). */
export const useInstall = (): InstallApi => useContext(InstallContext)
