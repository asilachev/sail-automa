import { createContext, useContext } from 'react'
import type { ScreenMotion } from './motion.ts'

/**
 * The app's screens (design A to F). Each screen's issue adds its name here and its view in
 * App.tsx; until then a screen falls back to Home.
 */
export type ScreenName = 'home' | 'newVoyage' | 'setup' | 'game' | 'result' | 'log' | 'settings'

export interface Nav {
  readonly screen: ScreenName
  /**
   * Goes to a screen with board 03's motion: `push` forward (Home to New voyage), `back` in
   * reverse, `fade` for game steps, `none` for no motion.
   */
  go(screen: ScreenName, motion?: ScreenMotion): void
}

export const NavContext = createContext<Nav>({ screen: 'home', go: () => {} })

export const useNav = (): Nav => useContext(NavContext)

export const SCREEN_NAMES: readonly ScreenName[] = [
  'home',
  'newVoyage',
  'setup',
  'game',
  'result',
  'log',
  'settings',
]
