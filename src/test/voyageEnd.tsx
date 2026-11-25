import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { toSave, type ScriptedVoyage } from '../engine/index.ts'
import { NavContext, type Nav, type ScreenName } from '../ui/nav.ts'
import { LOG_KEY, type VoyageRecord } from '../ui/state/history.ts'
import { VOYAGE_KEY } from '../ui/state/voyage.ts'

/**
 * Shared helpers for the screens around a voyage's end (#8): seed the saved voyage and the
 * captain's log in storage, and render a screen with a spy for navigation.
 */
export function saveVoyageForTest(voyage: ScriptedVoyage): void {
  localStorage.setItem(VOYAGE_KEY, JSON.stringify(toSave(voyage.settings, voyage.events)))
}

export function saveLogForTest(entries: readonly VoyageRecord[]): void {
  localStorage.setItem(LOG_KEY, JSON.stringify({ version: 1, entries }))
}

/** A made-up log entry; override what the test cares about. */
export function logEntry(over: Partial<VoyageRecord> = {}): VoyageRecord {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-11-19T19:00:00.000Z',
    settings: { scenario: 3, difficulty: 'medium' },
    outcome: 'won',
    reason: 'end',
    round: 4,
    ...over,
  }
}

/** Renders a screen inside a navigation context whose `go` is a spy. */
export function renderWithNav(ui: ReactNode, screen: ScreenName = 'home') {
  const go = vi.fn<Nav['go']>()
  const utils = render(<NavContext.Provider value={{ screen, go }}>{ui}</NavContext.Provider>)
  return { ...utils, go }
}
