import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../../engine/index.ts'
import { NavContext, type Nav } from '../nav.ts'
import { LAST_SETTINGS_KEY, loadLastSettings, saveLastSettings } from '../state/lastSettings.ts'
import { loadVoyage, saveVoyage } from '../state/voyage.ts'
import { NewVoyage } from './NewVoyage.tsx'

beforeEach(() => localStorage.clear())

function renderNewVoyage() {
  const go = vi.fn<Nav['go']>()
  render(
    <NavContext.Provider value={{ screen: 'newVoyage', go }}>
      <NewVoyage />
    </NavContext.Provider>,
  )
  return { go, user: userEvent.setup() }
}

const pressed = (name: string) => screen.getByRole('button', { name, pressed: true })

describe('New voyage (design B1)', () => {
  it('offers the Learning scenario and 1 to 5 (docs/decisions.md), starting from the defaults', () => {
    renderNewVoyage()
    expect(screen.getByRole('heading', { level: 1, name: 'NEW VOYAGE' })).toBeInTheDocument()
    const scenarios = screen.getByRole('group', { name: 'SCENARIO' })
    expect(
      within(scenarios)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Learning', '1', '2', '3', '4', '5'])
    expect(pressed('Learning scenario')).toBeInTheDocument()
    expect(pressed('Start on my left')).toBeInTheDocument()
    expect(pressed('Medium')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Cannon \+ Wheel/ })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Rulings' })).toHaveAccessibleDescription(
      '5 rulings · all defaults',
    )
  })

  it('starts from the last voyage’s settings', () => {
    saveLastSettings({ ...DEFAULT_SETTINGS, scenario: 4, seat: 'right', difficulty: 'easy' })
    renderNewVoyage()
    expect(pressed('Scenario 4')).toBeInTheDocument()
    expect(pressed('Start on my right')).toBeInTheDocument()
    expect(pressed('Easy')).toBeInTheDocument()
  })

  it('greys out the Bosun’s Cannon + Wheel on Hard, where it has no Pirate card (B5)', async () => {
    const { user } = renderNewVoyage()
    const cw = screen.getByRole('switch', { name: /Cannon \+ Wheel/ })
    await user.click(cw)
    expect(cw).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Hard' }))
    expect(cw).toBeDisabled()
    expect(cw).not.toBeChecked()
    expect(screen.getByText('On Hard the Bosun has no Pirate card.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Easy' }))
    expect(cw).toBeEnabled()
    expect(cw).toBeChecked()
  })

  it('saves the choices and goes to Set up the table', async () => {
    const { user, go } = renderNewVoyage()
    await user.click(screen.getByRole('button', { name: 'Scenario 3' }))
    await user.click(screen.getByRole('button', { name: 'Start on my right' }))
    await user.click(screen.getByRole('button', { name: 'Hard' }))
    await user.click(screen.getByRole('button', { name: 'Next · set up the table' }))
    expect(loadLastSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      scenario: 3,
      seat: 'right',
      difficulty: 'hard',
    })
    expect(go).toHaveBeenCalledWith('setup', 'push')
  })

  it('goes back Home', async () => {
    const { user, go } = renderNewVoyage()
    await user.click(screen.getByRole('button', { name: 'Home' }))
    expect(go).toHaveBeenCalledWith('home', 'back')
  })
})

describe('the rulings sheet (design B4; docs/automa.md → Rulings)', () => {
  it('lists the five rulings with their defaults and sources', async () => {
    const { user } = renderNewVoyage()
    await user.click(screen.getByRole('button', { name: 'Rulings' }))
    const sheet = screen.getByRole('dialog', { name: 'RULINGS' })
    const rulings = within(sheet).getAllByRole('region')
    expect(rulings.map((r) => r.getAttribute('aria-label'))).toEqual([
      'The ship sails past the End token',
      'Who decides if the Bosun uses its Pirate',
      'Cannon + Wheel pirate’s new action',
      'Too few cards to deal 9 each',
      'The fourth trick’s action',
    ])
    expect(within(sheet).getAllByText('DEFAULT')).toHaveLength(5)
    expect(within(sheet).getByText('Russian rulebook p. 4; Allplay on BGG')).toBeInTheDocument()
    // Rulings 2 and 4 have a single option: nothing to change.
    expect(within(sheet).getAllByRole('button', { name: /^Change:/ })).toHaveLength(3)
  })

  it('changes a ruling in the voyage-to-be’s settings', async () => {
    const { user } = renderNewVoyage()
    await user.click(screen.getByRole('button', { name: 'Rulings' }))
    const sheet = screen.getByRole('dialog', { name: 'RULINGS' })
    await user.click(
      within(sheet).getByRole('button', { name: 'Change: The ship sails past the End token' }),
    )
    const pastEnd = within(sheet).getByRole('region', { name: 'The ship sails past the End token' })
    expect(within(pastEnd).getByText('Nothing happens')).toBeInTheDocument()
    expect(within(pastEnd).queryByText('DEFAULT')).toBeNull()
    await user.click(within(sheet).getByRole('button', { name: 'Close RULINGS' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Rulings' })).toHaveAccessibleDescription(
      '5 rulings · 1 changed',
    )
    await user.click(screen.getByRole('button', { name: 'Next · set up the table' }))
    expect(loadLastSettings()?.rulings.pastEnd).toBe('nothing')
  })
})

describe('Abandon this voyage? (design D7)', () => {
  const saved: Settings = { ...DEFAULT_SETTINGS, scenario: 2 }

  it('asks before a new voyage replaces the saved one; Keep sailing goes back Home', async () => {
    saveVoyage({ settings: saved, events: [] })
    const { user, go } = renderNewVoyage()
    const dialog = screen.getByRole('alertdialog', { name: 'Abandon this voyage?' })
    expect(dialog).toHaveAccessibleDescription(
      'A new voyage clears the saved one. It goes into the log as unfinished.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Keep sailing' }))
    await waitFor(() => expect(go).toHaveBeenCalledWith('home', 'back'))
    expect(loadVoyage().voyage?.settings).toEqual(saved)
  })

  it('clears the saved voyage on Abandon and start new', async () => {
    saveVoyage({ settings: saved, events: [] })
    const { user } = renderNewVoyage()
    const dialog = screen.getByRole('alertdialog', { name: 'Abandon this voyage?' })
    const yes = within(dialog).getByRole('button', { name: 'Abandon and start new' })
    await waitFor(() => expect(yes).toHaveAttribute('data-armed', 'true'))
    await user.click(yes)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(loadVoyage().voyage).toBeNull()
  })

  it('doesn’t ask when no voyage is saved', () => {
    renderNewVoyage()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(localStorage.getItem(LAST_SETTINGS_KEY)).toBeNull()
  })
})
