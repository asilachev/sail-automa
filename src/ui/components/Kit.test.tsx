import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardSymbol } from '../../engine/index.ts'
import { ActionBar, Dock } from './Bars.tsx'
import { Button } from './Button.tsx'
import { ChipGroup, OptionCards, SegmentGroup, SymbolPicker } from './Choices.tsx'
import { Hud } from './Hud.tsx'
import { InstallCard } from './InstallCard.tsx'
import { Dialog, Sheet } from './Layers.tsx'
import { MiniMap } from './MiniMap.tsx'
import { CheckItem, LanguageRow, ListRow, RulingRow, Step, Steps, ToggleRow } from './Rows.tsx'
import { RuleTip } from './RuleTip.tsx'
import { useToasts } from './toast.ts'
import { Toaster } from './Toaster.tsx'

afterEach(() => vi.useRealTimers())

describe('buttons', () => {
  it('are buttons named by their label, and a disabled one ignores taps', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <Button onClick={onClick}>Continue</Button>
        <Button variant="danger" disabled onClick={onClick}>
          End voyage
        </Button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'End voyage' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'End voyage' })).toBeDisabled()
  })
})

describe('choices', () => {
  function Winner() {
    const [value, setValue] = useState<'you' | 'bosun' | null>(null)
    return (
      <SegmentGroup
        label="The winner"
        options={[
          { value: 'you', label: 'You' },
          { value: 'bosun', label: 'Bosun' },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  }

  it('segments are toggle buttons in a labelled group, one pressed at a time', async () => {
    const user = userEvent.setup()
    render(<Winner />)
    const group = screen.getByRole('group', { name: 'The winner' })
    const you = within(group).getByRole('button', { name: 'You' })
    const bosun = within(group).getByRole('button', { name: 'Bosun' })
    expect(you).toHaveAttribute('aria-pressed', 'false')
    await user.click(you)
    expect(you).toHaveAttribute('aria-pressed', 'true')
    await user.click(bosun)
    expect(you).toHaveAttribute('aria-pressed', 'false')
    expect(bosun).toHaveAttribute('aria-pressed', 'true')
  })

  it('scenario chips can carry a longer name than their label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ChipGroup
        label="Scenario"
        options={[
          { value: 'learning', label: 'L', name: 'Learning' },
          { value: '1', label: '1' },
        ]}
        value="1"
        onChange={onChange}
      />,
    )
    const group = screen.getByRole('group', { name: 'Scenario' })
    expect(within(group).getByRole('button', { name: '1' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(group).getByRole('button', { name: 'Learning' }))
    expect(onChange).toHaveBeenCalledWith('learning')
  })

  it('the symbol picker offers the four symbols by name', async () => {
    const user = userEvent.setup()
    function Picker() {
      const [value, setValue] = useState<CardSymbol | null>(null)
      return <SymbolPicker label="Your card" value={value} onChange={setValue} />
    }
    render(<Picker />)
    const group = screen.getByRole('group', { name: 'Your card' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Helm', 'Helm & Kraken', 'Tail', 'Cannon'])
    await user.click(within(group).getByRole('button', { name: 'Helm & Kraken' }))
    expect(within(group).getByRole('button', { name: 'Helm & Kraken' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('option cards are named by their title and described by their line', () => {
    render(
      <OptionCards
        label="Difficulty"
        options={[{ value: 'easy', label: 'Easy', description: 'Two Pirate cards, shared.' }]}
        value="easy"
        onChange={() => {}}
      />,
    )
    const easy = screen.getByRole('button', { name: 'Easy' })
    expect(easy).toHaveAttribute('aria-pressed', 'true')
    expect(easy).toHaveAccessibleDescription('Two Pirate cards, shared.')
  })
})

describe('rows', () => {
  it('steps are a numbered list', () => {
    render(
      <Steps label="How the Bosun follows">
        <Step n={1}>Play a card.</Step>
        <Step n={2}>Flip its cards.</Step>
      </Steps>,
    )
    const list = screen.getByRole('list', { name: 'How the Bosun follows' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })

  it('a checklist line is a checkbox that ticks and unticks (companion → checklists)', async () => {
    const user = userEvent.setup()
    function Line() {
      const [done, setDone] = useState(false)
      return (
        <CheckItem checked={done} onChange={setDone}>
          Ship on the start token.
        </CheckItem>
      )
    }
    render(<Line />)
    const line = screen.getByRole('checkbox', { name: 'Ship on the start token.' })
    expect(line).not.toBeChecked()
    await user.click(line)
    expect(line).toBeChecked()
    await user.click(line)
    expect(line).not.toBeChecked()
  })

  it('a toggle row is a switch named by its label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ToggleRow
        label="Keep the screen awake"
        hint="While a voyage is open"
        checked
        onChange={onChange}
      />,
    )
    const toggle = screen.getByRole('switch', { name: 'Keep the screen awake' })
    expect(toggle).toHaveAccessibleDescription('While a voyage is open')
    expect(toggle).toBeChecked()
    await user.click(toggle)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('a list row is a button with its label and value', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ListRow label="Captain’s log" value="7 voyages" onClick={onClick} />)
    const row = screen.getByRole('button', { name: 'Captain’s log' })
    expect(row).toHaveAccessibleDescription('7 voyages')
    await user.click(row)
    expect(onClick).toHaveBeenCalled()
  })

  it('a language row is pressed when chosen, named in its own language', () => {
    render(<LanguageRow code="ES" name="Español" lang="es" selected={false} onSelect={() => {}} />)
    const row = screen.getByRole('button', { name: 'Español' })
    expect(row).toHaveAttribute('aria-pressed', 'false')
    expect(within(row).getByText('Español')).toHaveAttribute('lang', 'es')
  })

  it('a ruling shows its default and a Change button named after the question', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RulingRow
        question="The ship sails past the End token"
        answer="You lose"
        source="Russian rulebook p. 4"
        onChange={onChange}
      />,
    )
    const ruling = screen.getByRole('region', { name: 'The ship sails past the End token' })
    expect(within(ruling).getByText('DEFAULT')).toBeInTheDocument()
    expect(within(ruling).getByText('You lose')).toBeInTheDocument()
    await user.click(
      within(ruling).getByRole('button', { name: 'Change: The ship sails past the End token' }),
    )
    expect(onChange).toHaveBeenCalled()
  })
})

describe('rule tip', () => {
  it('opens and closes its text from the title', async () => {
    const user = userEvent.setup()
    render(<RuleTip title="Why its top card?">The Bosun gives you its top card.</RuleTip>)
    const title = screen.getByRole('button', { name: 'Why its top card?' })
    expect(title).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('The Bosun gives you its top card.')).not.toBeVisible()
    await user.click(title)
    expect(title).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('The Bosun gives you its top card.')).toBeVisible()
  })
})

describe('sheet', () => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        {open ? (
          <Sheet title="MENU" onClose={() => setOpen(false)}>
            <button type="button">First</button>
            <button type="button">Last</button>
          </Sheet>
        ) : null}
      </>
    )
  }

  it('is a labelled dialog that traps focus and gives it back on Escape', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const sheet = screen.getByRole('dialog', { name: 'MENU' })
    expect(sheet).toHaveFocus()
    const close = screen.getByRole('button', { name: 'Close MENU' })
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
  })

  it('closes from its close button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('button', { name: 'Close MENU' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('dialog', () => {
  it('is an alertdialog whose danger button only works after 300 ms (board 03 → DIALOG)', () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <Dialog
        title="End this voyage?"
        body="The saved voyage is cleared."
        confirmLabel="End voyage"
        cancelLabel="Keep sailing"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )
    const dialog = screen.getByRole('alertdialog', { name: 'End this voyage?' })
    expect(dialog).toHaveAccessibleDescription('The saved voyage is cleared.')
    const confirm = within(dialog).getByRole('button', { name: 'End voyage' })
    act(() => confirm.click())
    expect(onConfirm).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    act(() => confirm.click())
    expect(onConfirm).toHaveBeenCalledTimes(1)
    act(() => within(dialog).getByRole('button', { name: 'Keep sailing' }).click())
    expect(onClose).toHaveBeenCalled()
  })
})

describe('toasts', () => {
  function Undoer({ onUndo }: { onUndo: () => void }) {
    const toasts = useToasts()
    return (
      <button
        type="button"
        onClick={() =>
          toasts.push({
            key: 'undone',
            text: 'Undone: trick 5',
            action: { label: 'Undo more', run: onUndo },
          })
        }
      >
        Undo
      </button>
    )
  }

  it('announce politely, run their action, and leave after the hold', () => {
    vi.useFakeTimers()
    const onUndo = vi.fn()
    render(
      <Toaster>
        <Undoer onUndo={onUndo} />
      </Toaster>,
    )
    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    const status = screen.getByRole('status')
    expect(within(status).getByText('Undone: trick 5')).toBeInTheDocument()
    act(() => within(status).getByRole('button', { name: 'Undo more' }).click())
    expect(onUndo).toHaveBeenCalled()
    expect(within(status).queryByText('Undone: trick 5')).toBeNull()

    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    act(() => vi.advanceTimersByTime(3999))
    expect(within(status).getByText('Undone: trick 5')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(within(status).queryByText('Undone: trick 5')).toBeNull()
  })

  it('with the same key replace each other in place', () => {
    render(
      <Toaster>
        <Undoer onUndo={() => {}} />
      </Toaster>,
    )
    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    act(() => screen.getByRole('button', { name: 'Undo' }).click())
    expect(within(screen.getByRole('status')).getAllByText('Undone: trick 5')).toHaveLength(1)
  })
})

describe('bars', () => {
  it('the dock names its four tools, and Undo is off with nothing to undo', async () => {
    const user = userEvent.setup()
    const onMenu = vi.fn()
    render(
      <ActionBar
        note="Pick the winner and both symbols"
        dock={
          <Dock
            canUndo={false}
            onUndo={() => {}}
            onLog={() => {}}
            onRules={() => {}}
            onMenu={onMenu}
          />
        }
      >
        <Button disabled>Done · trick 6</Button>
      </ActionBar>,
    )
    expect(screen.getByText('Pick the winner and both symbols')).toBeInTheDocument()
    const dock = screen.getByRole('navigation', { name: 'Voyage tools' })
    expect(
      within(dock)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Undo', 'Log', 'Rules', 'Menu'])
    expect(within(dock).getByRole('button', { name: 'Undo' })).toBeDisabled()
    await user.click(within(dock).getByRole('button', { name: 'Menu' }))
    expect(onMenu).toHaveBeenCalled()
  })
})

describe('HUD', () => {
  it('reads out the tricks, the round and the Kraken deck', () => {
    render(
      <Hud
        round={3}
        tricks={{ you: 2, bosun: 1 }}
        kraken={{ above: 3, below: 1, cards: 4 }}
        track={2}
      />,
    )
    const hud = screen.getByRole('region', { name: 'Play area' })
    expect(within(hud).getByRole('img', { name: 'You: 2 of 4 tricks' })).toBeInTheDocument()
    expect(within(hud).getByRole('img', { name: 'Bosun: 1 of 4 tricks' })).toBeInTheDocument()
    expect(hud).toHaveTextContent('ROUNDIIIof V')
    expect(hud).toHaveTextContent('4 cards left')
    // The track is 3, 3, 4, 5, skull (decisions.md): space 2 is 4 attacks.
    expect(hud).toHaveTextContent('Attacks at round end4')
  })

  it('says skull when the Kraken stands on it', () => {
    render(
      <Hud
        round={5}
        tricks={{ you: 0, bosun: 0 }}
        kraken={{ above: 0, below: 0, cards: 0 }}
        track={4}
      />,
    )
    expect(screen.getByRole('region', { name: 'Play area' })).toHaveTextContent(
      'Attacks at round endSkull',
    )
  })
})

describe('mini map', () => {
  it('is a picture named after the move', () => {
    render(
      <>
        <MiniMap heading="bosun" />
        <MiniMap heading="straight" />
        <MiniMap heading="you" />
      </>,
    )
    for (const name of ['Toward the Bosun', 'One space straight', 'Toward you'])
      expect(screen.getByRole('img', { name })).toBeInTheDocument()
  })
})

describe('install card', () => {
  it('offers Install', async () => {
    const user = userEvent.setup()
    const onInstall = vi.fn()
    render(<InstallCard onInstall={onInstall} />)
    const card = screen.getByRole('region', { name: 'Install the app' })
    await user.click(within(card).getByRole('button', { name: 'Install' }))
    expect(onInstall).toHaveBeenCalled()
  })
})
