import { useLayoutEffect, type ReactNode } from 'react'
import type { ScreenMotion } from '../motion.ts'
import styles from './layers.module.css'

/**
 * Shows one screen with board 03's arrival: `push` slides it in from the right (Home to New
 * voyage), `back` reverses it, `fade` cross-fades (every game step), `none` just shows it (a
 * launch, Undo, Reload, a new language: moments never replay). Give it a `key` per screen, so a new
 * screen mounts and plays its arrival once. Each screen opens at its top.
 */
export function Screen({ motion, children }: { motion: ScreenMotion; children: ReactNode }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <div className={styles.stage}>
      <div className={styles.screen} data-motion={motion}>
        {children}
      </div>
    </div>
  )
}
