import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { logEntry, renderWithNav, saveLogForTest } from '../../test/voyageEnd.tsx'
import { loadLog } from '../state/history.ts'
import { CaptainsLog } from './CaptainsLog.tsx'

beforeEach(() => localStorage.clear())

const LOG = [
  logEntry({ date: '2026-11-19T19:00:00Z' }),
  logEntry({
    date: '2026-11-18T19:00:00Z',
    settings: { scenario: 3, difficulty: 'hard' },
    outcome: 'lost',
    reason: 'krakenAlone',
    round: 3,
  }),
  logEntry({
    date: '2026-11-17T19:00:00Z',
    settings: { scenario: 2, difficulty: 'medium' },
    outcome: 'lost',
    reason: 'storm',
    round: 2,
  }),
  logEntry({
    date: '2026-11-02T19:00:00Z',
    settings: { scenario: 'learning', difficulty: 'easy' },
    outcome: 'unfinished',
    reason: null,
    round: 1,
  }),
]

describe('the captain’s log (design E3)', () => {
  it('shows voyages, landfalls and the win rate', () => {
    saveLogForTest(LOG)
    renderWithNav(<CaptainsLog />, 'log')
    expect(screen.getByRole('heading', { level: 1, name: 'CAPTAIN’S LOG' })).toBeInTheDocument()
    const figures = screen.getAllByRole('definition')
    expect(figures.map((f) => f.textContent)).toEqual([
      '4',
      'since 2 Nov',
      '1',
      'voyage',
      '25%',
      'all levels',
    ])
  })

  it('fills the grid: gold where land was reached, tries elsewhere, Learning first', () => {
    saveLogForTest(LOG)
    renderWithNav(<CaptainsLog />, 'log')
    const table = screen.getByRole('table', { name: 'SCENARIOS BY DIFFICULTY' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(7)
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('Learning')
    expect(rows[1]).toHaveTextContent('1 tried')
    expect(rows[4]).toHaveTextContent('Reached land')
    expect(rows[4]).toHaveTextContent('1 tried')
    expect(within(rows[6]!).getAllByText('Not played')).toHaveLength(3)
  })

  it('lists recent voyages with date, scenario, difficulty and outcome', () => {
    saveLogForTest(LOG)
    renderWithNav(<CaptainsLog />, 'log')
    const items = within(screen.getByRole('region', { name: 'RECENT VOYAGES' })).getAllByRole(
      'listitem',
    )
    expect(items.map((i) => i.textContent)).toEqual([
      'Thu 19 NovScenario 3 · MediumLand in IV',
      'Wed 18 NovScenario 3 · HardKraken in III',
      'Tue 17 NovScenario 2 · MediumStorm after II',
      'Mon 2 NovLearning · EasyEnded in I',
    ])
  })

  it('clears the log only after asking (design E4)', async () => {
    saveLogForTest(LOG)
    renderWithNav(<CaptainsLog />, 'log')
    await userEvent.click(screen.getByRole('button', { name: 'Clear the log' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Clear the captain’s log?' })
    expect(dialog).toHaveAccessibleDescription(
      'All 4 voyages are deleted from this phone. This can’t be undone.',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep the log' }))
    expect(loadLog()).toHaveLength(4)

    await userEvent.click(screen.getByRole('button', { name: 'Clear the log' }))
    // The danger button ignores taps for its first 300 ms (kit Dialog).
    await new Promise((r) => setTimeout(r, 350))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Clear the log' }),
    )
    expect(loadLog()).toEqual([])
    expect(screen.getByRole('heading', { name: 'No voyages yet' })).toBeInTheDocument()
  })

  it('says why it is empty and offers the first voyage (design E5)', async () => {
    const { go } = renderWithNav(<CaptainsLog />, 'log')
    expect(screen.getByRole('heading', { name: 'No voyages yet' })).toBeInTheDocument()
    expect(
      screen.getByText('Finish a voyage, win or lose, and it’s written here.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Start your first voyage' }))
    expect(go).toHaveBeenCalledWith('newVoyage', 'push')
  })

  it('goes back Home', async () => {
    const { go } = renderWithNav(<CaptainsLog />, 'log')
    await userEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(go).toHaveBeenCalledWith('home', 'back')
  })
})
