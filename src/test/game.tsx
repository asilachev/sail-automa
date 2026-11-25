import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import type { CardSymbol, ScriptedVoyage, Side } from '../engine/index.ts'
import { Toaster } from '../ui/components/Toaster.tsx'
import { Game } from '../ui/game/Game.tsx'
import { renderWithNav, saveVoyageForTest } from './voyageEnd.tsx'

/**
 * Shared helpers for the game screen (#7, #9): seed a voyage from an engine fixture and render
 * the game with its toasts, and tap a trick the way a user does. English texts.
 */
export function renderGame(voyage: ScriptedVoyage) {
  saveVoyageForTest(voyage)
  return renderWithNav(
    <Toaster>
      <Game />
    </Toaster>,
    'game',
  )
}

const SYMBOL: Readonly<Record<CardSymbol, string>> = {
  helm: 'Helm',
  helmKraken: 'Helm & Kraken',
  tail: 'Tail',
  cannon: 'Cannon',
}

/** On a trick's screen: picks who took it and both symbols, then taps Done. */
export async function playTrick(
  user: UserEvent,
  winner: Side,
  yours: CardSymbol,
  bosuns: CardSymbol,
): Promise<void> {
  const who = screen.getByRole('group', { name: 'Who took the trick?' })
  await user.click(within(who).getByRole('button', { name: winner === 'you' ? 'You' : 'Bosun' }))
  const mine = screen.getByRole('group', { name: 'Your card' })
  await user.click(within(mine).getByRole('button', { name: SYMBOL[yours] }))
  const its = screen.getByRole('group', { name: 'Bosun’s card' })
  await user.click(within(its).getByRole('button', { name: SYMBOL[bosuns] }))
  await user.click(screen.getByRole('button', { name: /^Done/ }))
}
