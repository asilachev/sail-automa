import { FIXTURES, fixture, fromScript, type FixtureName } from '../../engine/index.ts'
import { saveVoyage } from '../state/voyage.ts'
import type { GameLayer } from './Game.tsx'

const LAYERS: readonly GameLayer[] = ['menu', 'log', 'rules', 'rulings', 'fix', 'swap', 'end']

/**
 * The dev-only fixture route (AGENTS.md → Any state from a fixture), for screenshots and the
 * guide: `/?fixture=orderAttack` saves the engine fixture as the voyage in progress and opens the
 * game on it; `/?script=x%20Yhh` does the same for any fixture script; `&layer=menu` (or log,
 * rules, rulings, fix, swap, end) opens that sheet or dialog on top. The shell only calls this
 * on the dev server, so builds leave it out, like `/?kit`.
 */
export function openFixture(search: string): { layer: GameLayer | null } | null {
  const params = new URLSearchParams(search)
  const name = params.get('fixture')
  const script = params.get('script')
  let voyage
  try {
    if (name !== null && name in FIXTURES) voyage = fixture(name as FixtureName)
    else if (script !== null) voyage = fromScript(script)
    else return null
  } catch {
    return null
  }
  saveVoyage(voyage)
  const layer = params.get('layer') as GameLayer | null
  return { layer: layer !== null && LAYERS.includes(layer) ? layer : null }
}
