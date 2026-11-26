import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RULINGS, fixture, fromScript } from '../../engine/index.ts'
import { playTrick, renderGame } from '../../test/game.tsx'
import { loadLog } from '../state/history.ts'
import { loadVoyage, VOYAGE_KEY } from '../state/voyage.ts'

beforeEach(() => localStorage.clear())

const events = () => loadVoyage().voyage?.events ?? []
const heading = () => screen.getByRole('heading', { level: 1 })
const done = () => screen.getByRole('button', { name: /^(Done|Next|Exchange|Dealt)/ })

describe('the exchange (C1)', () => {
  it('shows round I’s exchange and records it', async () => {
    const user = userEvent.setup()
    renderGame(fixture('exchange'))
    expect(heading()).toHaveTextContent('ROUND I · THE EXCHANGE')
    expect(screen.getByRole('region', { name: 'Play area' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Exchange done · trick 1' }))
    expect(events()).toEqual([{ type: 'exchange' }])
    expect(heading()).toHaveTextContent('TRICK 1 · YOU LEAD')
  })
})

describe('a trick (C2–C4)', () => {
  it('keeps Done disabled, with a note, until the winner and both symbols are picked', async () => {
    const user = userEvent.setup()
    renderGame(fixture('trickYouLead'))
    expect(done()).toBeDisabled()
    expect(screen.getByText('Pick the winner and both symbols')).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('group', { name: 'Who took the trick?' })).getByRole('button', {
        name: 'Bosun',
      }),
    )
    await user.click(
      within(screen.getByRole('group', { name: 'Your card' })).getByRole('button', {
        name: 'Helm & Kraken',
      }),
    )
    expect(screen.getByText('Pick the Bosun’s symbol')).toBeInTheDocument()
    expect(done()).toBeDisabled()
    await user.click(
      within(screen.getByRole('group', { name: 'Bosun’s card' })).getByRole('button', {
        name: 'Helm',
      }),
    )
    expect(done()).toBeEnabled()
    await user.click(done())
    expect(events().at(-1)).toEqual({
      type: 'trick',
      winner: 'bosun',
      yours: 'helmKraken',
      bosuns: 'helm',
    })
  })

  it('opens the how-to the first time each side leads in a round, folded after', async () => {
    const user = userEvent.setup()
    renderGame(fromScript('x B! Y! B!'))
    // Trick 4: the Bosun led trick 2 already this round.
    expect(heading()).toHaveTextContent('TRICK 4 · THE BOSUN LEADS')
    const folded = screen.getByRole('button', { name: /^HOW THE BOSUN LEADS/ })
    expect(folded).toHaveAttribute('aria-expanded', 'false')
    await user.click(folded)
    expect(screen.getByRole('heading', { name: 'HOW THE BOSUN LEADS' })).toBeInTheDocument()
  })

  it('says who won the last trick above the title', () => {
    renderGame(fixture('trickBosunLeads'))
    expect(screen.getByText('IT WON TRICK 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'HOW THE BOSUN LEADS' })).toBeInTheDocument()
  })
})

describe('the order (C5)', () => {
  it('shows the move toward the winner and the attack, asks the token, then commits', async () => {
    const user = userEvent.setup()
    renderGame(fixture('orderAttack'))
    expect(heading()).toHaveTextContent('TRICK 1 · THE ORDER')
    expect(screen.getByRole('img', { name: 'Toward the Bosun' })).toBeInTheDocument()
    expect(screen.getByText('KRAKEN ×1')).toBeInTheDocument()
    expect(done()).toBeDisabled()
    expect(screen.getByText('Answer where the ship stopped')).toBeInTheDocument()
    // Each answer is an event, and each event shows the step afresh: find the group again.
    const tokens = () => screen.getByRole('group', { name: 'Did the ship move onto a token?' })
    await user.click(within(tokens()).getByRole('button', { name: 'Kraken token' }))
    // A Kraken token adds an attack (docs/rules.md → Hazards).
    expect(screen.getByText('KRAKEN ×2')).toBeInTheDocument()
    await user.click(within(tokens()).getByRole('button', { name: 'No' }))
    expect(screen.getByText('KRAKEN ×1')).toBeInTheDocument()
    expect(events().filter((e) => e.type === 'ship')).toEqual([{ type: 'ship', onto: 'open' }])
    await user.click(screen.getByRole('button', { name: 'Done · trick 2' }))
    expect(events().at(-1)).toEqual({ type: 'orderDone' })
    expect(heading()).toHaveTextContent('TRICK 2 · THE BOSUN LEADS')
  })

  it('reminds who may use a Pirate card: the Bosun, decided by you (ruling 2)', () => {
    renderGame(fixture('orderAttack'))
    expect(
      screen.getByText('The Bosun won: it may use its Pirate card. You decide for it.'),
    ).toBeInTheDocument()
  })

  it('reminds nothing for the Bosun on Hard, where it has no Pirate card', () => {
    renderGame(fromScript('x Bkh', { difficulty: 'hard' }))
    expect(screen.queryByText(/may use its Pirate card/)).not.toBeInTheDocument()
  })

  it('ruling 3, any trick winner: the Bosun may use your Cannon + Wheel by its swap (#22)', () => {
    renderGame(fixture('yourCannonWheelAnyWinner'))
    expect(
      screen.getByText('The Bosun won: it may use your Cannon + Wheel. You decide for it.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Using Cannon + Wheel? Follow its swap' }),
    ).toBeInTheDocument()
  })

  it('ruling 3, only its owner: you holding it, the Bosun gets no swap', () => {
    renderGame(fromScript('x Bkh', { cannonWheel: 'you' }))
    expect(
      screen.getByText('The Bosun won: it may use its Pirate card. You decide for it.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Follow its swap/ })).not.toBeInTheDocument()
  })

  it('ruling 3, any trick winner: you may use the Bosun’s Cannon + Wheel when you win', () => {
    const anyWinner = { ...DEFAULT_RULINGS, cannonWheel: 'anyWinner' } as const
    renderGame(fromScript('x Ykh', { cannonWheel: 'bosun', rulings: anyWinner }))
    expect(
      screen.getByText('You won: you may use your Pirate card or the Bosun’s Cannon + Wheel.'),
    ).toBeInTheDocument()
  })

  it('walks through the Bosun’s Cannon + Wheel swap (C7)', async () => {
    const user = userEvent.setup()
    renderGame(fixture('bosunCannonWheel'))
    await user.click(screen.getByRole('button', { name: 'Using Cannon + Wheel? Follow its swap' }))
    const sheet = screen.getByRole('dialog', { name: 'THE BOSUN’S CANNON + WHEEL' })
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(4)
    const before = events().length
    await user.click(within(sheet).getByRole('button', { name: 'Swap done' }))
    // Screen-only: the swap changes no counts.
    expect(events()).toHaveLength(before)
  })

  it('goes back to the trick with its picks on Change', async () => {
    const user = userEvent.setup()
    renderGame(fixture('orderAttack'))
    await user.click(screen.getByRole('button', { name: 'Change the winner and the symbols' }))
    expect(heading()).toHaveTextContent('TRICK 1 · YOU LEAD')
    expect(
      within(screen.getByRole('group', { name: 'Who took the trick?' })).getByRole('button', {
        name: 'Bosun',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(done()).toBeEnabled()
  })

  it('hits the Kraken with Helm & Kraken + Cannon', () => {
    renderGame(fixture('orderKrakenHit'))
    expect(screen.getByText(/^Hit the Kraken/)).toBeInTheDocument()
    expect(done()).toBeEnabled()
  })
})

describe('cannon + cannon (C6)', () => {
  it('asks for the flipped card, one flip at a time while it shows a cannon', async () => {
    const user = userEvent.setup()
    renderGame(fixture('cannonFlip'))
    expect(heading()).toHaveTextContent('TRICK 1 · CANNON + CANNON')
    expect(screen.getByText('Pick the flipped card’s symbol')).toBeInTheDocument()
    const picker = () => screen.getByRole('group', { name: 'The flipped card’s symbol' })
    await user.click(within(picker()).getByRole('button', { name: 'Cannon' }))
    expect(screen.getByText('Flipped so far: Cannon')).toBeInTheDocument()
    await user.click(within(picker()).getByRole('button', { name: 'Tail' }))
    expect(screen.getByText('Move the ship one space straight forward.')).toBeInTheDocument()
    expect(events().filter((e) => e.type === 'flip')).toHaveLength(2)
  })

  it('stops when the player deck runs out', async () => {
    const user = userEvent.setup()
    // Round I's player deck holds 3 cards after the deal.
    renderGame(fromScript('x Ycc fc fc'))
    const picker = screen.getByRole('group', { name: 'The flipped card’s symbol' })
    await user.click(within(picker).getByRole('button', { name: 'Cannon' }))
    expect(
      screen.getAllByText('The player deck is empty: no further effect.').length,
    ).toBeGreaterThan(0)
    expect(done()).toBeEnabled()
  })
})

describe('round end (C8) and the new deal (C9)', () => {
  it('lists each attack and keeps Next disabled until the storm check names its column', async () => {
    const user = userEvent.setup()
    renderGame(fixture('roundEndStorm'))
    expect(heading()).toHaveTextContent('ROUND II ENDS')
    expect(screen.getByText('THE KRAKEN ATTACKS 3 TIMES')).toBeInTheDocument()
    expect(screen.getAllByText('Discard the top card of the Kraken deck.')).toHaveLength(3)
    expect(done()).toBeDisabled()
    expect(screen.getByText('Answer the storm check')).toBeInTheDocument()
    const q = screen.getByRole('group', {
      name: 'Is the ship in a column beyond the storm in column 5?',
    })
    await user.click(within(q).getByRole('button', { name: 'Yes, past it' }))
    await user.click(screen.getByRole('button', { name: 'Next · round III' }))
    expect(heading()).toHaveTextContent('ROUND III · NEW DEAL')
    expect(screen.getByText('STORM PASSED · KRAKEN AT 3')).toBeInTheDocument()
    expect(screen.getByText('You lead first this round.')).toBeInTheDocument()
  })

  it('shows the track change when the Kraken card comes up: 3× → 4×', () => {
    renderGame(fromScript('x Ykc . Ykc . Ykc . Bkk @k . Bkk @k . Y! e d x Ykc . Ykc . B!*4'))
    expect(heading()).toHaveTextContent('ROUND II ENDS')
    expect(screen.getByRole('img', { name: 'Attacks at round end: 3 to 4' })).toBeInTheDocument()
  })

  it('goes to the result when the voyage is lost', async () => {
    const user = userEvent.setup()
    const { go } = renderGame(fromScript(`${'x Ykc . Ykc . Y!*2'} e d x B!*4`))
    const q = screen.getByRole('group', { name: /beyond the storm/ })
    await user.click(within(q).getByRole('button', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(go).toHaveBeenCalledWith('result', 'fade'))
  })
})

describe('undo (D3)', () => {
  it('takes back the last tap and says what it undid, with Undo more', async () => {
    const user = userEvent.setup()
    renderGame(fromScript('x Y!'))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Undone: trick 1')).toBeInTheDocument()
    expect(events()).toEqual([
      { type: 'exchange' },
      { type: 'trick', winner: 'you', yours: 'tail', bosuns: 'cannon' },
    ])
    await user.click(screen.getByRole('button', { name: 'Undo more' }))
    expect(await screen.findByText('Undone: trick 1')).toBeInTheDocument()
    expect(events()).toEqual([{ type: 'exchange' }])
    await user.click(screen.getByRole('button', { name: 'Undo more' }))
    expect(await screen.findByText('Undone: round I’s exchange')).toBeInTheDocument()
    expect(events()).toEqual([])
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})

describe('the menu (D1, D2)', () => {
  it('goes Home with the voyage saved', async () => {
    const user = userEvent.setup()
    const { go } = renderGame(fixture('trickYouLead'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Back to home · voyage saved' }))
    expect(go).toHaveBeenCalledWith('home', 'back')
    expect(localStorage.getItem(VOYAGE_KEY)).not.toBeNull()
  })

  it('ends the voyage after asking, and logs it as unfinished', async () => {
    const user = userEvent.setup()
    const { go } = renderGame(fixture('trickYouLead'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'End this voyage' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'End this voyage?' })
    const yes = within(dialog).getByRole('button', { name: 'End voyage' })
    await waitFor(() => expect(yes).toHaveAttribute('data-armed', 'true'))
    await user.click(yes)
    expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
    expect(loadLog()).toHaveLength(1)
    expect(go).toHaveBeenCalledWith('home', 'back')
  })

  it('switches keeping the screen awake', async () => {
    const user = userEvent.setup()
    renderGame(fixture('trickYouLead'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const awake = screen.getByRole('switch', { name: 'Keep the screen awake' })
    expect(awake).toHaveAttribute('aria-checked', 'true')
  })

  it('shows this voyage’s rulings, read-only', async () => {
    const user = userEvent.setup()
    renderGame(
      fromScript('x', { rulings: { ...fixture('exchange').settings.rulings, pastEnd: 'nothing' } }),
    )
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: /This voyage’s rulings/ }))
    const sheet = await screen.findByRole('dialog', { name: 'RULINGS' })
    expect(within(sheet).queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument()
  })
})

describe('the ship’s log (D4) and Fix the trackers (D5)', () => {
  it('lists the voyage newest first', async () => {
    const user = userEvent.setup()
    renderGame(fromScript('x Yhh @o . Bkc .'))
    await user.click(screen.getByRole('button', { name: 'Log' }))
    const sheet = screen.getByRole('dialog', { name: 'SHIP’S LOG' })
    const rows = within(sheet).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Helm & Kraken + Cannon')
    expect(rows[0]).toHaveTextContent('Bosun took it · The Kraken is hit: card under its deck')
    expect(rows[1]).toHaveTextContent('You took it · Toward you')
    expect(rows[2]).toHaveTextContent('The exchange')
  })

  it('fixes the trackers into the log, and Undo takes the fix back', async () => {
    const user = userEvent.setup()
    renderGame(fixture('trickYouLead'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Fix the trackers' }))
    const sheet = await screen.findByRole('dialog', { name: 'FIX THE TRACKERS' })
    const save = within(sheet).getByRole('button', { name: 'Save fixes' })
    expect(save).toBeDisabled()
    await user.click(
      within(sheet).getByRole('button', { name: 'Fewer: Cards above the Kraken card' }),
    )
    await user.click(save)
    expect(events().at(-1)).toEqual({
      type: 'fix',
      round: 1,
      tricks: { you: 0, bosun: 0 },
      above: 5,
      below: 0,
      track: 0,
      playerDeck: 3,
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Log' }))
    const log = screen.getByRole('dialog', { name: 'SHIP’S LOG' })
    expect(within(log).getAllByRole('listitem')[0]).toHaveTextContent('Trackers fixed')
    await user.click(screen.getByRole('button', { name: 'Close SHIP’S LOG' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Undone: the tracker fix')).toBeInTheDocument()
    expect(events().some((e) => e.type === 'fix')).toBe(false)
  })

  it('fixes the round and both trick counts (D5, #31)', async () => {
    const user = userEvent.setup()
    renderGame(fromScript('x Y!'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Fix the trackers' }))
    const sheet = await screen.findByRole('dialog', { name: 'FIX THE TRACKERS' })
    expect(within(sheet).getByText('ROUND AND TRICKS')).toBeInTheDocument()
    const round = within(sheet).getByRole('group', { name: 'Round' })
    expect(round).toHaveTextContent(/^RoundI$/)
    await user.click(within(sheet).getByRole('button', { name: 'More: Round' }))
    await user.click(within(sheet).getByRole('button', { name: 'More: Round' }))
    expect(round).toHaveTextContent(/^RoundIII$/)
    await user.click(within(sheet).getByRole('button', { name: 'More: Tricks · Bosun' }))
    await user.click(within(sheet).getByRole('button', { name: 'More: Tricks · You' }))
    await user.click(within(sheet).getByRole('button', { name: 'More: Tricks · You' }))
    // Each trick cube stops at 3 mid-round.
    expect(within(sheet).getByRole('button', { name: 'More: Tricks · You' })).toBeDisabled()
    await user.click(within(sheet).getByRole('button', { name: 'Save fixes' }))
    expect(events().at(-1)).toMatchObject({ round: 3, tricks: { you: 3, bosun: 1 } })
    expect(heading()).toHaveTextContent('TRICK 5')
    await user.click(screen.getByRole('button', { name: 'Log' }))
    const log = screen.getByRole('dialog', { name: 'SHIP’S LOG' })
    expect(within(log).getAllByRole('listitem')[0]).toHaveTextContent('Round III · tricks 3–1')
  })

  it('keeps the tricks as they are once the round is ending (#31)', async () => {
    const user = userEvent.setup()
    renderGame(fromScript('x Y!*4'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Fix the trackers' }))
    const sheet = await screen.findByRole('dialog', { name: 'FIX THE TRACKERS' })
    for (const side of ['You', 'Bosun']) {
      expect(within(sheet).getByRole('button', { name: `More: Tricks · ${side}` })).toBeDisabled()
      expect(within(sheet).getByRole('button', { name: `Fewer: Tricks · ${side}` })).toBeDisabled()
    }
    expect(within(sheet).getByRole('button', { name: 'More: Round' })).toBeEnabled()
  })

  it('won’t save a Kraken deck with no numbered card', async () => {
    const user = userEvent.setup()
    renderGame(fromScript('x fix:1,0,0,3'))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Fix the trackers' }))
    const sheet = await screen.findByRole('dialog', { name: 'FIX THE TRACKERS' })
    await user.click(
      within(sheet).getByRole('button', { name: 'Fewer: Cards above the Kraken card' }),
    )
    expect(within(sheet).getByRole('button', { name: 'Save fixes' })).toBeDisabled()
    expect(within(sheet).getByText(/at least one numbered card/)).toBeInTheDocument()
  })
})

describe('the combos (D6)', () => {
  it('lists the seven pairs and the four cannon actions', async () => {
    const user = userEvent.setup()
    renderGame(fixture('trickYouLead'))
    await user.click(screen.getByRole('button', { name: 'Rules' }))
    const sheet = screen.getByRole('dialog', { name: 'THE COMBOS' })
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(11)
    expect(within(sheet).getByRole('img', { name: 'Cannon + Cannon' })).toBeInTheDocument()
  })
})

describe('a whole round', () => {
  it('plays round I from the exchange to the new deal', async () => {
    const user = userEvent.setup()
    renderGame(fixture('exchange'))
    await user.click(done())
    for (let i = 0; i < 4; i++) {
      await playTrick(user, 'you', 'tail', 'cannon')
      await user.click(done())
    }
    expect(heading()).toHaveTextContent('ROUND I ENDS')
    await user.click(done())
    expect(heading()).toHaveTextContent('ROUND II · NEW DEAL')
    await user.click(done())
    expect(heading()).toHaveTextContent('ROUND II · THE EXCHANGE')
  })
})
