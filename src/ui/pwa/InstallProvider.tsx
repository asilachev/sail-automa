import { useMemo, useState, type ReactNode } from 'react'
import { usePrefs } from '../state/PrefsContext.ts'
import { InstallContext, type InstallApi } from './install.ts'
import { isIosSafari, isStandalone, useInstallPrompt } from './pwa.ts'
import { InstallSheet } from './Pwa.tsx'

/**
 * Install help: Chrome's own prompt where the browser offers one, and on iPhone Safari the
 * F1 · Install on iPhone sheet, shown by itself once on Home (`offerOnce`), then from the install
 * card and Settings.
 */
export function InstallProvider({
  offerOnce,
  children,
}: {
  /** Home is on screen, so the one-time iPhone sheet may show. */
  offerOnce: boolean
  children: ReactNode
}) {
  const { prefs, update } = usePrefs()
  const { available, install } = useInstallPrompt()
  const [ios] = useState(() => isIosSafari() && !isStandalone())
  const [open, setOpen] = useState(false)
  const api = useMemo<InstallApi>(
    () => ({
      canInstall: available || ios,
      install: () => {
        if (available) void install()
        else if (ios) setOpen(true)
      },
    }),
    [available, install, ios],
  )
  const showSheet = ios && (open || (offerOnce && !prefs.installHintSeen))
  return (
    <InstallContext.Provider value={api}>
      {children}
      {showSheet ? (
        <InstallSheet
          onClose={() => {
            setOpen(false)
            if (!prefs.installHintSeen) update({ installHintSeen: true })
          }}
        />
      ) : null}
    </InstallContext.Provider>
  )
}
