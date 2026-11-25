import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fixture, fromScript, FIXTURES } from '../../engine/index.ts'
import { renderWithNav, saveVoyageForTest } from '../../test/voyageEnd.tsx'
import { loadLog } from '../state/history.ts'
import { loadLastSettings } from '../state/lastSettings.ts'
import { VOYAGE_KEY } from '../state/voyage.ts'
import { VoyageEnd } from './VoyageEnd.tsx'

beforeEach(() => localStorage.clear())

describe('Land ho (design E1)', () => {
  it('says you reached the End token, in which round, and logs the voyage', () => {
    saveVoyageForTest(fromScript(FIXTURES.won.script, { scenario: 3, difficulty: 'medium' }))
    renderWithNav(<VoyageEnd />, 'result')
    expect(screen.getByRole('heading', { level: 1, name: 'LAND HO!' })).toBeInTheDocument()
    expect(screen.getByText('You reached the End token in round I.')).toBeInTheDocument()
    expect(screen.getByText('Scenario 3 · Medium · in the captain’s log')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Captain’s log' })).toHaveAccessibleDescription(
      '1 of 1',
    )
    expect(loadLog()).toMatchObject([{ outcome: 'won', reason: 'end', round: 1 }])
  })

  it('logs the voyage once, however often the screen shows it', () => {
    saveVoyageForTest(fixture('won'))
    const first = renderWithNav(<VoyageEnd />, 'result')
    first.unmount()
    renderWithNav(<VoyageEnd />, 'result')
    expect(loadLog()).toHaveLength(1)
  })

  it('ends the voyage when you leave for a new one', async () => {
    saveVoyageForTest(fixture('won'))
    const { go } = renderWithNav(<VoyageEnd />, 'result')
    await userEvent.click(screen.getByRole('button', { name: 'New voyage' }))
    expect(go).toHaveBeenCalledWith('newVoyage', 'push')
    expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
  })

  it('goes Home without a finished voyage', () => {
    saveVoyageForTest(fixture('trickYouLead'))
    const { go } = renderWithNav(<VoyageEnd />, 'result')
    expect(go).toHaveBeenCalledWith('home', 'none')
    expect(loadLog()).toEqual([])
  })
})

describe('The Kraken wins (design E2)', () => {
  it('gives the reason from the engine and lists the other ways to sink', () => {
    saveVoyageForTest(fixture('lostKrakenAlone'))
    renderWithNav(<VoyageEnd />, 'result')
    expect(screen.getByRole('heading', { level: 1, name: 'THE KRAKEN WINS' })).toBeInTheDocument()
    expect(screen.getByText('Only the Kraken card was left in the Kraken deck.')).toBeInTheDocument()
    const ways = screen.getByRole('list')
    expect(ways.children).toHaveLength(4)
    expect(ways).toHaveTextContent('Behind a storm at the end of round II or IV')
    expect(ways).not.toHaveTextContent('Only the Kraken card')
  })

  it('names the storm when the ship was behind it', () => {
    saveVoyageForTest(fixture('lostStorm'))
    renderWithNav(<VoyageEnd />, 'result')
    expect(
      screen.getByText('The ship was still behind the storm at the end of round II.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('Only the Kraken card is left')
    expect(loadLog()).toMatchObject([{ outcome: 'lost', reason: 'storm', round: 2 }])
  })

  it('tries the same scenario again through setup, with the same settings', async () => {
    const voyage = fromScript(FIXTURES.lostPastEnd.script, { scenario: 4, difficulty: 'hard' })
    saveVoyageForTest(voyage)
    const { go } = renderWithNav(<VoyageEnd />, 'result')
    await userEvent.click(screen.getByRole('button', { name: 'Try scenario 4 again' }))
    expect(go).toHaveBeenCalledWith('setup', 'push')
    expect(loadLastSettings()).toEqual(voyage.settings)
    expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
  })

  it('says Learning for the Learning scenario', () => {
    saveVoyageForTest(fromScript(FIXTURES.lostPastEnd.script, { scenario: 'learning' }))
    renderWithNav(<VoyageEnd />, 'result')
    expect(
      screen.getByRole('button', { name: 'Try the Learning scenario again' }),
    ).toBeInTheDocument()
  })
})
