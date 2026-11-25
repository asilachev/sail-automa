import { render, screen, type RenderResult } from '@testing-library/react'
import { fromScript, type Settings } from '../engine/index.ts'
import { App } from '../ui/App.tsx'
import { DEFAULT_PREFS, PREFS_KEY, type Prefs } from '../ui/state/prefs.ts'
import { saveVoyage } from '../ui/state/voyage.ts'

/** A voyage scenario 3 · Medium at round III, trick 5, You 2, Bosun 2 (design A3). */
export const ROUND_III_TRICK_5 = 'x Ykc . Ykc . Y!*2 e d x B!*4 s+ e d x Y! B! Y! B! fix:3,1,2,4'

/** Saves a voyage from an engine script (src/engine/fixtures.ts), as if played on this phone. */
export function saveScript(script: string, settings: Partial<Settings> = {}): void {
  const { settings: full, events } = fromScript(script, settings)
  saveVoyage({ settings: full, events })
}

/** Saves device preferences before the app loads them. */
export function savePrefsForTest(change: Partial<Prefs>): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, ...change }))
}

/** Renders the whole app and waits for Home. */
export async function renderApp(): Promise<RenderResult> {
  const result = render(<App />)
  await screen.findByRole('heading', { name: 'BOSUN', level: 1 })
  return result
}
