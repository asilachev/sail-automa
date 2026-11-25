import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'

/** What to pick on New voyage; anything left out keeps what the screen shows. */
export interface VoyageChoices {
  /** The scenario chip's name: 'Learning scenario', 'Scenario 3'. */
  readonly scenario?: string
  /** The difficulty's title: 'Easy', 'Medium', 'Hard'. */
  readonly difficulty?: string
}

/**
 * Starts a voyage the way a user does (design B1 → B2 → the game): from Home's New voyage button
 * when New voyage isn't showing yet, abandoning a saved voyage if asked (D7), picking the choices,
 * then ticking every line of Set up the table and tapping Set sail. Ends on the game screen.
 * English texts; render the app (or New voyage / Set up the table) first.
 */
export async function startVoyage(user: UserEvent, choices: VoyageChoices = {}): Promise<void> {
  const onSetup = () => screen.queryByRole('heading', { level: 1, name: 'SET UP THE TABLE' })
  const onNewVoyage = () => screen.queryByRole('heading', { level: 1, name: 'NEW VOYAGE' })
  if (!onSetup() && !onNewVoyage()) {
    await user.click(screen.getByRole('button', { name: /^new voyage$/i }))
  }
  const abandon = screen.queryByRole('alertdialog', { name: 'Abandon this voyage?' })
  if (abandon) {
    const yes = within(abandon).getByRole('button', { name: 'Abandon and start new' })
    // The danger button ignores taps for its first 300 ms (Components → Dialog).
    await waitFor(() => expect(yes).toHaveAttribute('data-armed', 'true'))
    await user.click(yes)
  }
  if (!onSetup()) {
    if (choices.scenario) await user.click(screen.getByRole('button', { name: choices.scenario }))
    if (choices.difficulty) {
      await user.click(screen.getByRole('button', { name: choices.difficulty }))
    }
    await user.click(screen.getByRole('button', { name: 'Next · set up the table' }))
  }
  for (const box of screen.getAllByRole('checkbox', { checked: false })) await user.click(box)
  await user.click(screen.getByRole('button', { name: 'Set sail' }))
}
