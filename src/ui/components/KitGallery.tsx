import {
  ArrowCounterClockwise,
  ArrowRight,
  BookOpen,
  Plus,
  Scroll,
  Users,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { LANGS, useI18n } from '../i18n/index.ts'
import { usePrefs } from '../state/PrefsContext.ts'
import { THEMES } from '../state/prefs.ts'
import { ActionBar, Dock } from './Bars.tsx'
import { Button } from './Button.tsx'
import { ChipGroup, OptionCards, SegmentGroup, SymbolPicker } from './Choices.tsx'
import { Hud } from './Hud.tsx'
import { InstallCard } from './InstallCard.tsx'
import { Dialog, Sheet } from './Layers.tsx'
import { MiniMap } from './MiniMap.tsx'
import { CheckItem, LanguageRow, ListRow, RulingRow, Step, Steps, ToggleRow } from './Rows.tsx'
import { RuleTip } from './RuleTip.tsx'
import type { CardSymbol } from './pieces.ts'
import { useToasts } from './toast.ts'
import styles from './gallery.module.css'

/**
 * Every kit component on one page, for visual checks against the design's Components board.
 * Dev only (`/?kit`, or `/?kit=sheet`, `=dialog`, `=toast` to open one); never in a build.
 * The texts are demo texts, not locale keys: this page ships nowhere.
 */
export function KitGallery() {
  const { t, lang, setLang } = useI18n()
  const { prefs, update } = usePrefs()
  const toasts = useToasts()
  const open = new URLSearchParams(location.search).get('kit')
  const [sheet, setSheet] = useState(open === 'sheet')
  const [dialog, setDialog] = useState(open === 'dialog')
  const [shown, setShown] = useState(false)
  const [winner, setWinner] = useState<'you' | 'bosun' | null>('you')
  const [stop, setStop] = useState<string | null>('open')
  const [scenario, setScenario] = useState<string | null>('3')
  const [symbol, setSymbol] = useState<CardSymbol | null>('hk')
  const [difficulty, setDifficulty] = useState<string | null>('medium')
  const [ticks, setTicks] = useState([false, true])
  const [awake, setAwake] = useState(true)

  const undone = () =>
    toasts.push({
      key: 'undone',
      icon: <ArrowCounterClockwise size={18} weight="fill" />,
      text: 'Undone: trick 5',
      action: { label: 'Undo more', run: undone },
    })
  if (open === 'toast' && !shown) {
    setShown(true)
    queueMicrotask(undone)
  }

  return (
    <div className={styles.page}>
      <Hud
        round={3}
        tricks={{ you: 2, bosun: 2 }}
        kraken={{ above: 3, below: 2 }}
        krakenSpace={2}
      />
      <main className={styles.body}>
        <h1 className={styles.title}>Kit</h1>
        <SegmentGroup
          label={t('theme.label')}
          showLabel
          options={THEMES.map((v) => ({ value: v, label: t(`theme.${v}`) }))}
          value={prefs.theme}
          onChange={(theme) => update({ theme })}
        />

        <h2 className={styles.section}>Buttons</h2>
        <Button iconEnd={<ArrowRight size={20} weight="fill" />}>Continue</Button>
        <Button variant="secondary" icon={<Plus size={18} weight="bold" />}>
          New voyage
        </Button>
        <Button variant="danger">End voyage</Button>
        <Button disabled iconEnd={<ArrowRight size={20} weight="fill" />}>
          Disabled
        </Button>
        <div>
          <Button variant="text">End this voyage</Button>
        </div>

        <h2 className={styles.section}>Choices</h2>
        <SegmentGroup
          label="The winner"
          showLabel
          options={[
            { value: 'you', label: t('common.you') },
            { value: 'bosun', label: t('common.bosun') },
          ]}
          value={winner}
          onChange={setWinner}
        />
        <SymbolPicker label="Your card" value={symbol} onChange={setSymbol} />
        <ChipGroup
          label="Scenario"
          showLabel
          options={[
            { value: 'L', label: 'L', name: 'Learning' },
            ...['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v })),
            { value: '7', label: '7', expansion: true },
          ]}
          value={scenario}
          onChange={setScenario}
        />
        <SegmentGroup
          label="Did the ship move onto a token?"
          showLabel
          size="small"
          options={[
            { value: 'open', label: 'Open sea' },
            { value: 'kraken', label: 'Kraken token' },
            { value: 'end', label: 'End token' },
          ]}
          value={stop}
          onChange={setStop}
        />
        <OptionCards
          label="Difficulty"
          showLabel
          options={[
            {
              value: 'easy',
              label: 'Easy',
              description: 'Two Pirate cards, shared. Whoever wins the trick may use either.',
            },
            {
              value: 'medium',
              label: 'Medium',
              description: 'One Pirate card each. The winner may use their own.',
            },
          ]}
          value={difficulty}
          onChange={setDifficulty}
        />

        <h2 className={styles.section}>Steps and checklist</h2>
        <Steps>
          <Step n={1}>Play a card from your hand.</Step>
          <Step n={2}>Flip the Bosun’s cards from the top, one by one.</Step>
        </Steps>
        {['Ship on the start token.', 'Round disc on I, on your side.'].map((text, i) => (
          <CheckItem
            key={text}
            checked={ticks[i] === true}
            onChange={(c) => setTicks((ts) => ts.map((v, j) => (j === i ? c : v)))}
          >
            {text}
          </CheckItem>
        ))}
        <RuleTip title="Why its top card?" defaultOpen>
          Sail Solitaire, Play: the Bosun gives you the top card of its stack.
        </RuleTip>

        <h2 className={styles.section}>Rows and surfaces</h2>
        <ToggleRow
          label="Keep the screen awake"
          hint="While a voyage is open"
          checked={awake}
          onChange={setAwake}
        />
        <ListRow
          icon={<Scroll size={20} weight="fill" />}
          label="Captain’s log"
          value="7 voyages"
          onClick={() => {}}
        />
        <ListRow
          icon={<BookOpen size={20} weight="fill" />}
          label="Rules and rulings"
          onClick={() => {}}
        />
        <ListRow
          icon={<Users size={20} weight="fill" />}
          label="Credits"
          onClick={() => setSheet(true)}
        />
        {LANGS.slice(0, 2).map((l) => (
          <LanguageRow
            key={l.code}
            code={l.code.toUpperCase()}
            name={l.name}
            lang={l.tag}
            selected={lang === l.code}
            onSelect={() => setLang(l.code)}
          />
        ))}
        <RulingRow
          question="The ship sails past the End token"
          answer="You lose"
          source="Russian rulebook p. 4; Allplay on BGG"
          onChange={() => {}}
        />
        <InstallCard onInstall={() => {}} />
        <div className={styles.maps}>
          <MiniMap heading="bosun" />
          <MiniMap heading="straight" />
          <MiniMap heading="you" />
        </div>
        <Button variant="secondary" onClick={() => setDialog(true)}>
          Open the dialog
        </Button>
        <Button variant="secondary" onClick={undone}>
          Show a toast
        </Button>
      </main>
      <ActionBar
        note="Pick the winner and both symbols"
        dock={
          <Dock
            canUndo
            onUndo={undone}
            onLog={() => setSheet(true)}
            onRules={() => setSheet(true)}
            onMenu={() => setSheet(true)}
          />
        }
      >
        <Button iconEnd={<ArrowRight size={20} weight="fill" />}>Continue</Button>
      </ActionBar>
      {sheet ? (
        <Sheet title="MENU" onClose={() => setSheet(false)}>
          <ToggleRow
            label="Keep the screen awake"
            hint="While a voyage is open"
            checked={awake}
            onChange={setAwake}
          />
          <ListRow
            icon={<Scroll size={20} weight="fill" />}
            label="Ship’s log"
            onClick={() => {}}
          />
        </Sheet>
      ) : null}
      {dialog ? (
        <Dialog
          title="End this voyage?"
          body="The saved voyage is cleared and goes into the log as unfinished."
          confirmLabel="End voyage"
          cancelLabel="Keep sailing"
          onConfirm={() => setDialog(false)}
          onClose={() => setDialog(false)}
        />
      ) : null}
    </div>
  )
}
