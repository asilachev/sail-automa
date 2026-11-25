import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { currentStep, hud, replay, type VoyageEvent, type VoyageState } from '../../engine/index.ts'
import { Dialog, Dock, Hud, useToasts } from '../components/index.ts'
import { useT } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { useCaptainsLog } from '../state/history.ts'
import { useVoyage } from '../state/useVoyage.ts'
import { RulingsSheet } from '../newVoyage/RulingsSheet.tsx'
import styles from './game.module.css'
import {
  CannonWheelSheet,
  CombosSheet,
  FixTrackersSheet,
  MenuSheet,
  ShipsLogSheet,
  type MenuTarget,
} from './Sheets.tsx'
import {
  DealStep,
  ExchangeStep,
  OrderStep,
  RoundEndStep,
  TrickStep,
  type TrickPicks,
} from './Steps.tsx'
import { undoneText } from './words.ts'

/** The layers over the game: the menu's sheets, the swap sheet and the end dialog. */
export type GameLayer = 'menu' | 'log' | 'rules' | 'rulings' | 'fix' | 'swap' | 'end'

/**
 * The voyage at the table (design C1 to C9, D1 to D6): the HUD on top, the engine's current step,
 * and the action bar with the dock at the bottom. Every tap is an engine event, saved at once;
 * Undo takes back the last one.
 */
export function Game({ initialLayer = null }: { initialLayer?: GameLayer | null }) {
  const t = useT()
  const nav = useNav()
  const toasts = useToasts()
  const api = useVoyage()
  const { record } = useCaptainsLog()
  const [layer, setLayer] = useState<GameLayer | null>(initialLayer)
  // The picks to show again after Change on the order (screen-only).
  const [draft, setDraft] = useState<TrickPicks | null>(null)
  const voyage = api.voyage
  // The latest voyage, for the toast's Undo more, which outlives the render it came from.
  const latest = useRef(voyage)
  useEffect(() => {
    latest.current = voyage
  })
  const undoLast = api.undo
  const step = voyage ? currentStep(voyage.state) : null

  const over = step?.kind === 'won' || step?.kind === 'lost'
  useEffect(() => {
    if (!voyage) nav.go('home', 'none')
    else if (over) nav.go('result', 'fade')
  }, [voyage, over, nav])

  const dispatch = useCallback(
    (event: VoyageEvent) => {
      api.dispatch(event)
      setDraft(null)
    },
    [api],
  )

  /**
   * Replaces the last event of a type (a changed answer): takes back it and everything after,
   * then records the new answer and puts the later events back where the rules still allow.
   */
  const amend = useCallback(
    (type: VoyageEvent['type'], event: VoyageEvent) => {
      const events = api.voyage?.events ?? []
      const at = events.map((e) => e.type).lastIndexOf(type)
      if (at < 0) {
        api.dispatch(event)
        return
      }
      for (let i = events.length; i > at; i--) api.undo()
      api.dispatch(event)
      for (const later of events.slice(at + 1)) {
        try {
          api.dispatch(later)
        } catch {
          // No longer allowed after the new answer: dropped.
        }
      }
    },
    [api],
  )

  /** Takes back the last tap and says what was undone, with Undo more (D3 · Undone). */
  const undo = () => {
    const before = latest.current
    const undone = undoLast()
    if (!undone || !before) return
    latest.current = { ...before, events: before.events.slice(0, -1) }
    setDraft(null)
    const now = currentStep(replay(before.settings, before.events.slice(0, -1)))
    toasts.push({
      key: 'undo',
      icon: <ArrowCounterClockwise size={18} weight="fill" aria-hidden />,
      text: undoneText(t, undone, now),
      action: { label: t('undo.more'), run: undo },
    })
  }

  if (!voyage || !step) return null
  const state: VoyageState = voyage.state

  /** Change on the order: back to the trick's screen with its picks, keeping later fixes. */
  const changeTrick = () => {
    if (step.kind !== 'order') return
    const { winner, yours, bosuns } = step.order
    const events = voyage.events
    const at = events.map((e) => e.type).lastIndexOf('trick')
    if (at < 0) return
    for (let i = events.length; i > at; i--) api.undo()
    for (const later of events.slice(at + 1)) if (later.type === 'fix') api.dispatch(later)
    setDraft({ winner, yours, bosuns })
  }

  const onMenu = (target: MenuTarget) => {
    if (target === 'home') nav.go('home', 'back')
    else setLayer(target)
  }

  const dock = (
    <Dock
      canUndo={api.canUndo}
      onUndo={undo}
      onLog={() => setLayer('log')}
      onRules={() => setLayer('rules')}
      onMenu={() => setLayer('menu')}
    />
  )
  const props = { state, dispatch, amend, dock }
  const close = () => setLayer(null)

  return (
    <div className={styles.game}>
      <Hud {...hud(state)} />
      {/* A new key per event: each step mounts fresh, with its own screen-only picks. */}
      <div key={voyage.events.length} className={styles.step}>
        {step.kind === 'exchange' ? <ExchangeStep step={step} {...props} /> : null}
        {step.kind === 'trick' ? <TrickStep step={step} initial={draft} {...props} /> : null}
        {step.kind === 'order' ? (
          <OrderStep
            step={step}
            {...props}
            onChangeTrick={changeTrick}
            onSwap={() => setLayer('swap')}
            onFix={() => setLayer('fix')}
          />
        ) : null}
        {step.kind === 'roundEnd' ? <RoundEndStep step={step} {...props} /> : null}
        {step.kind === 'deal' ? <DealStep step={step} {...props} /> : null}
      </div>
      {layer === 'menu' ? <MenuSheet state={state} onClose={close} onPick={onMenu} /> : null}
      {layer === 'log' ? <ShipsLogSheet state={state} onClose={close} /> : null}
      {layer === 'rules' ? <CombosSheet onClose={close} /> : null}
      {layer === 'rulings' ? (
        <RulingsSheet rulings={voyage.settings.rulings} onClose={close} />
      ) : null}
      {layer === 'fix' ? (
        <FixTrackersSheet state={state} onClose={close} onSave={(e) => api.dispatch(e)} />
      ) : null}
      {layer === 'swap' ? <CannonWheelSheet onClose={close} /> : null}
      {layer === 'end' ? (
        <Dialog
          title={t('gameMenu.endTitle')}
          body={t('gameMenu.endBody')}
          confirmLabel={t('gameMenu.endYes')}
          onConfirm={() => {
            // The captain's log notes it as unfinished before the save is cleared (#8).
            record(voyage)
            api.end()
            nav.go('home', 'back')
          }}
          cancelLabel={t('gameMenu.endNo')}
          onClose={close}
        />
      ) : null}
    </div>
  )
}
