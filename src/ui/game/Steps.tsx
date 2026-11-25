import { ArrowRight, CaretDown, CaretUp, Cards, Check, Flag, Skull, X } from '@phosphor-icons/react'
import { useId, useState, type ReactNode } from 'react'
import {
  TRACK,
  type CardSymbol,
  type Side,
  type Step,
  type Token,
  type VoyageEvent,
  type VoyageState,
} from '../../engine/index.ts'
import {
  ActionBar,
  Button,
  numeral,
  Picture,
  RuleTip,
  SegmentGroup,
  Step as StepItem,
  Steps,
  SymbolPicker,
} from '../components/index.ts'
import { useT, type Translate } from '../i18n/index.ts'
import styles from './game.module.css'
import { OrderCard, TrickSummary } from './OrderCard.tsx'
import { howToOpens, symbolName } from './words.ts'

/** What every step gets from the game screen. */
export interface StepProps<K extends Step['kind']> {
  readonly step: Extract<Step, { kind: K }>
  readonly state: VoyageState
  /** Records a tap's event. */
  readonly dispatch: (event: VoyageEvent) => void
  /** Replaces the last event of a kind (a changed answer), keeping any fixes made after it. */
  readonly amend: (type: VoyageEvent['type'], event: VoyageEvent) => void
  /** The dock under the action. */
  readonly dock: ReactNode
}

/** The title block: eyebrow, title, sub. */
function Title({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <header className={styles.titleBlock}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      {sub ? <p className={styles.sub}>{sub}</p> : null}
    </header>
  )
}

function Next({
  label,
  note,
  disabled = false,
  dock,
  onClick,
}: {
  label: string
  note?: string | undefined
  disabled?: boolean
  dock: ReactNode
  onClick: () => void
}) {
  return (
    <ActionBar {...(disabled && note ? { note } : {})} dock={dock}>
      <Button
        disabled={disabled}
        iconEnd={<ArrowRight size={20} weight="bold" aria-hidden />}
        onClick={onClick}
      >
        {label}
      </Button>
    </ActionBar>
  )
}

// ── C1 · the exchange ──────────────────────────────────────────────────────────────────────

/** C1: the exchange (docs/automa.md → Play → Exchange). */
export function ExchangeStep({ step, dispatch, dock }: StepProps<'exchange'>) {
  const t = useT()
  return (
    <>
      <main className={styles.content} data-roomy="true">
        <Title
          eyebrow={t('game.quiet')}
          title={t('game.exchangeTitle', { round: numeral(step.round) })}
          sub={t('game.exchangeSub')}
        />
        <Steps>
          <StepItem n={1}>{t('game.exchange1')}</StepItem>
          <StepItem n={2}>{t('game.exchange2')}</StepItem>
          <StepItem n={3}>{t('game.exchange3')}</StepItem>
        </Steps>
        <RuleTip title={t('game.exchangeTipTitle')} defaultOpen>
          {t('game.exchangeTip')}
        </RuleTip>
      </main>
      <Next
        label={t('game.exchangeDone')}
        dock={dock}
        onClick={() => dispatch({ type: 'exchange' })}
      />
    </>
  )
}

// ── C2–C4 · a trick ────────────────────────────────────────────────────────────────────────

/** The winner and symbols picked on a trick's screen before Done: screen-only (pwa layer). */
export interface TrickPicks {
  readonly winner: Side | null
  readonly yours: CardSymbol | null
  readonly bosuns: CardSymbol | null
}

function missingNote(t: Translate, p: TrickPicks): string {
  const key = [p.winner ? '' : 'winner', p.yours ? '' : 'yours', p.bosuns ? '' : 'bosuns']
    .filter(Boolean)
    .join('-')
  return t('trick.note', { missing: key })
}

/** The label of Done on a trick and its order: the next trick, the round end, or just Done. */
function doneLabel(t: Translate, state: VoyageState, winner: Side | null): string {
  const played = state.tricks.you + state.tricks.bosun
  const next = played + 1
  const endsRound = winner !== null && (state.tricks[winner] + 1 >= 4 || next >= state.cardsEach)
  return endsRound ? t('trick.doneRoundEnd') : t('trick.doneTrick', { n: next + 1 })
}

/** C2, C3, C4: a trick, you lead or the Bosun leads; then who took it and the two symbols. */
export function TrickStep({
  step,
  state,
  dispatch,
  dock,
  initial,
}: StepProps<'trick'> & { initial: TrickPicks | null }) {
  const t = useT()
  const [picks, setPicks] = useState<TrickPicks>(
    initial ?? { winner: null, yours: null, bosuns: null },
  )
  const [open, setOpen] = useState(() => howToOpens(state, step.leader))
  const you = step.leader === 'you'
  const eyebrow =
    step.trick === 1
      ? t('trick.eyebrowFirst', { side: step.leader })
      : t('trick.eyebrowWon', { side: step.leader, n: step.trick - 1 })
  const ready = picks.winner !== null && picks.yours !== null && picks.bosuns !== null
  const howId = useId()
  return (
    <>
      <main className={styles.content}>
        <Title eyebrow={eyebrow} title={t('trick.title', { side: step.leader, n: step.trick })} />
        {open ? (
          <section className={styles.howOpen} aria-labelledby={howId}>
            <div className={styles.howHead}>
              <h2 id={howId} className={styles.howLabel}>
                {t(you ? 'trick.howFollow' : 'trick.howLead')}
              </h2>
              <button
                type="button"
                className={styles.hide}
                aria-expanded="true"
                onClick={() => setOpen(false)}
              >
                <span>{t('trick.hide')}</span>
                <CaretUp size={14} weight="fill" aria-hidden />
              </button>
            </div>
            {you ? (
              <>
                <Steps>
                  <StepItem n={1}>{t('trick.follow1')}</StepItem>
                  <StepItem n={2}>{t('trick.follow2')}</StepItem>
                  <StepItem n={3}>{t('trick.follow3')}</StepItem>
                  <StepItem n={4}>{t('trick.follow4')}</StepItem>
                </Steps>
                <FlippedCards />
                <p className={styles.caption}>{t('trick.followPeek')}</p>
              </>
            ) : (
              <Steps>
                <StepItem n={1}>{t('trick.lead1')}</StepItem>
                <StepItem n={2}>{t('trick.lead2')}</StepItem>
              </Steps>
            )}
          </section>
        ) : (
          <button
            type="button"
            className={styles.howFolded}
            aria-expanded="false"
            aria-label={`${t(you ? 'trick.howFollow' : 'trick.howLead')}: ${t(you ? 'trick.foldFollow' : 'trick.foldLead')}`}
            onClick={() => setOpen(true)}
          >
            <Cards size={20} weight="fill" aria-hidden className={styles.howIcon} />
            <span>{t(you ? 'trick.foldFollow' : 'trick.foldLead')}</span>
            <CaretDown size={16} weight="fill" aria-hidden className={styles.howCaret} />
          </button>
        )}
        <section className={styles.section}>
          <p className={styles.label} aria-hidden="true">
            {t('trick.who')}
          </p>
          {open ? <p className={styles.hint}>{t('trick.whoHint')}</p> : null}
          <SegmentGroup<Side>
            label={t('trick.whoLabel')}
            options={[
              { value: 'you', label: t('common.you') },
              { value: 'bosun', label: t('common.bosun') },
            ]}
            value={picks.winner}
            onChange={(winner) => setPicks((p) => ({ ...p, winner }))}
          />
        </section>
        <section className={styles.section}>
          <p className={styles.label} aria-hidden="true">
            {t('trick.symbols')}
          </p>
          <SymbolPicker
            label={t('trick.yourCard')}
            value={picks.yours}
            onChange={(yours) => setPicks((p) => ({ ...p, yours }))}
          />
          <SymbolPicker
            label={t('trick.bosunCard')}
            value={picks.bosuns}
            onChange={(bosuns) => setPicks((p) => ({ ...p, bosuns }))}
          />
        </section>
      </main>
      <Next
        label={doneLabel(t, state, picks.winner)}
        note={missingNote(t, picks)}
        disabled={!ready}
        dock={dock}
        onClick={() => {
          if (!picks.winner || !picks.yours || !picks.bosuns) return
          dispatch({
            type: 'trick',
            winner: picks.winner,
            yours: picks.yours,
            bosuns: picks.bosuns,
          })
        }}
      />
    </>
  )
}

/** The flipped cards in the how-to (C2): two that don't follow, the one that does, the rest. */
function FlippedCards() {
  return (
    <div className={styles.cards} aria-hidden="true">
      <span className={styles.cardUp}>
        <X size={14} weight="bold" />
      </span>
      <span className={styles.cardUp}>
        <X size={14} weight="bold" />
      </span>
      <span className={styles.cardUp} data-plays="true">
        <Check size={15} weight="bold" />
      </span>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={styles.cardDown}>
          <span />
        </span>
      ))}
    </div>
  )
}

// ── C5, C6 · the order ─────────────────────────────────────────────────────────────────────

const TOKEN_KEYS: Readonly<Record<Token, string>> = {
  open: 'order.tokenOpen',
  kraken: 'order.tokenKraken',
  end: 'order.tokenEnd',
  past: 'order.tokenPast',
}

/**
 * C5 and C6: the order. Dispatches `flip` while a flip is due, `ship` while the ship's stop is
 * asked, then `orderDone` (docs/automa.md → Steps and events).
 */
export function OrderStep({
  step,
  state,
  dispatch,
  amend,
  dock,
  onChangeTrick,
  onSwap,
  onFix,
}: StepProps<'order'> & {
  onChangeTrick: () => void
  onSwap: () => void
  onFix: () => void
}) {
  const t = useT()
  const { order } = step
  const cannon = order.cannon
  const flips = cannon?.flips ?? []
  // The picker shows the flip asked for now, or the last one once the chain is done.
  const shownFlip = cannon && !cannon.needed ? (flips[flips.length - 1] ?? null) : null
  const earlier = cannon?.needed ? flips : flips.slice(0, -1)
  const settings = state.settings
  const note =
    order.awaiting === 'flip'
      ? t('order.noteFlip')
      : order.awaiting === 'ship'
        ? t('order.noteShip')
        : undefined
  const label = order.outcome
    ? t('trick.done')
    : order.endsRound
      ? t('trick.doneRoundEnd')
      : t('trick.doneTrick', { n: step.trick + 1 })
  return (
    <>
      <main className={styles.content} data-roomy="true">
        <Title title={t(cannon ? 'order.cannonTitle' : 'order.title', { n: step.trick })} />
        <TrickSummary order={order} onChange={onChangeTrick} />
        {cannon && (cannon.needed || flips.length > 0) ? (
          <section className={styles.section}>
            <p className={styles.label}>{t('order.flipLabel')}</p>
            {earlier.length > 0 ? (
              <p className={styles.flipsSoFar}>
                {t('order.flipsSoFar', {
                  flips: earlier.map((s) => symbolName(t, s)).join(', '),
                })}
              </p>
            ) : null}
            <p className={styles.prompt}>
              {t(earlier.length > 0 ? 'order.flipAgainPrompt' : 'order.flipPrompt', {
                n: cannon.needed ? cannon.deckLeft : cannon.deckLeft + 1,
              })}
            </p>
            <SymbolPicker
              label={t('order.flipLabelA11y')}
              showLabel={false}
              value={shownFlip}
              onChange={(symbol) => {
                if (symbol === shownFlip) return
                if (cannon.needed) dispatch({ type: 'flip', symbol })
                else amend('flip', { type: 'flip', symbol })
              }}
            />
          </section>
        ) : null}
        {cannon?.emptyDeck ? <p className={styles.notice}>{t('order.emptyDeck')}</p> : null}
        {order.awaiting !== 'flip' ? <OrderCard order={order} seat={settings.seat} /> : null}
        {order.asksToken ? (
          <section className={styles.section}>
            <p className={styles.label} aria-hidden="true">
              {t('order.stop')}
            </p>
            <div className={styles.tokens}>
              <SegmentGroup<Token>
                label={t('order.stopLabel')}
                size="small"
                options={(['open', 'kraken', 'end', 'past'] as const).map((value) => ({
                  value,
                  label: t(TOKEN_KEYS[value] as 'order.tokenOpen'),
                }))}
                value={order.onto}
                onChange={(onto) => {
                  if (onto === order.onto) return
                  if (order.onto === null) dispatch({ type: 'ship', onto })
                  else amend('ship', { type: 'ship', onto })
                }}
              />
            </div>
            <p className={styles.hint}>{t('order.stopHint', { past: settings.rulings.pastEnd })}</p>
          </section>
        ) : null}
        {order.pirate.mayUse && order.awaiting !== 'flip' ? (
          <aside className={styles.pirate}>
            <p className={styles.pirateHead}>
              <Flag size={18} weight="fill" aria-hidden />
              <span>{t(order.winner === 'you' ? 'order.pirateYou' : 'order.pirateBosun')}</span>
            </p>
            {order.pirate.swap ? (
              <button type="button" className={styles.link} onClick={onSwap}>
                {t('order.swapLink')}
              </button>
            ) : null}
            <button type="button" className={styles.link} onClick={onFix}>
              {t('order.fixLink')}
            </button>
          </aside>
        ) : null}
      </main>
      <Next
        label={label}
        note={note}
        disabled={order.awaiting !== null}
        dock={dock}
        onClick={() => dispatch({ type: 'orderDone' })}
      />
    </>
  )
}

// ── C8 · round end ─────────────────────────────────────────────────────────────────────────

/** C8: the round's end: the Kraken's attacks one by one, then the storm check. */
export function RoundEndStep({ step, state, dispatch, amend, dock }: StepProps<'roundEnd'>) {
  const t = useT()
  const fourth: Side | 'none' =
    state.tricks.you >= 4 ? 'you' : state.tricks.bosun >= 4 ? 'bosun' : 'none'
  // The Kraken's space before each attack: where it stood, then where each Kraken card moved it.
  const trackBefore = step.attackEffects.map((_, i) => {
    const moved = step.attackEffects.slice(0, i).filter((e) => e.kind === 'krakenCard')
    const last = moved[moved.length - 1]
    return last && last.kind === 'krakenCard' ? last.track : state.kraken.track
  })
  const storm = step.storm
  const label = step.outcome
    ? t('roundEnd.nextOver')
    : t('roundEnd.next', { round: numeral(step.round + 1) })
  return (
    <>
      <main className={styles.content} data-roomy="true">
        <Title
          title={t('roundEnd.title', { round: numeral(step.round) })}
          sub={t('roundEnd.sub', { side: fourth })}
        />
        <section className={styles.attacks} aria-labelledby="attacks-label">
          <h2 id="attacks-label" className={styles.attacksLabel}>
            {t('roundEnd.attacks', { n: step.attacks })}
          </h2>
          <p className={styles.hint}>{t('roundEnd.attacksHint')}</p>
          <ol className={styles.attackList}>
            {step.attackEffects.map((effect, i) => {
              if (effect.kind === 'discard') {
                return (
                  <li key={i} className={styles.attackItem}>
                    <span className={styles.attackN}>{i + 1}</span>
                    <span>{t('roundEnd.discard')}</span>
                  </li>
                )
              }
              const from = TRACK[trackBefore[i] ?? state.kraken.track]
              const to = TRACK[effect.track]
              return (
                <li key={i} className={styles.attackItem} data-cycle="true">
                  <span className={styles.attackN}>{i + 1}</span>
                  <span className={styles.attackBody}>
                    <span>{t('roundEnd.cycle')}</span>
                    <span
                      className={styles.fury}
                      role="img"
                      aria-label={t('roundEnd.furyLabel', {
                        from: String(from),
                        to: to === 'skull' ? t('hud.skull') : String(to),
                      })}
                    >
                      <span aria-hidden="true">{t('roundEnd.times', { n: String(from) })}</span>
                      <ArrowRight size={14} weight="fill" aria-hidden />
                      <span aria-hidden="true" className={styles.furyTo}>
                        {to === 'skull' ? (
                          <Skull size={16} weight="fill" />
                        ) : (
                          t('roundEnd.times', { n: String(to) })
                        )}
                      </span>
                    </span>
                    <span className={styles.hint}>
                      {to === 'skull' ? t('roundEnd.skull') : t('roundEnd.fury', { n: to })}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
        {storm ? (
          <section className={styles.storm} aria-labelledby="storm-label">
            <div className={styles.stormHead}>
              <Picture name="cloud" size={36} />
              <h2 id="storm-label" className={styles.stormLabel}>
                {t('roundEnd.storm')}
              </h2>
            </div>
            <p className={styles.stormQ}>{t('roundEnd.stormQ', { column: storm.column })}</p>
            <SegmentGroup<boolean>
              label={t('roundEnd.stormQ', { column: storm.column })}
              options={[
                { value: true, label: t('roundEnd.yes') },
                { value: false, label: t('roundEnd.no') },
              ]}
              value={storm.passed}
              onChange={(passed) => {
                if (passed === storm.passed) return
                if (storm.passed === null) dispatch({ type: 'storm', passed })
                else amend('storm', { type: 'storm', passed })
              }}
            />
            <p className={styles.hint}>{t('roundEnd.stormHint')}</p>
          </section>
        ) : null}
      </main>
      <Next
        label={label}
        note={t('roundEnd.note')}
        disabled={!step.ready}
        dock={dock}
        onClick={() => dispatch({ type: 'roundEndDone' })}
      />
    </>
  )
}

// ── C9 · the new deal ──────────────────────────────────────────────────────────────────────

/** C9: the new deal: who leads, the cards each, the round disc. */
export function DealStep({ step, state, dispatch, dock }: StepProps<'deal'>) {
  const t = useT()
  const storm = [...state.log].reverse().find((e) => e.kind === 'storm')
  const passed = storm?.kind === 'storm' && storm.round === step.round - 1 && storm.passed
  const attacks = TRACK[state.kraken.track]
  return (
    <>
      <main className={styles.content} data-roomy="true">
        <Title
          eyebrow={t('deal.eyebrow', {
            storm: passed ? 'passed' : 'none',
            n: String(attacks),
          })}
          title={t('deal.title', { round: numeral(step.round) })}
          sub={t('deal.sub', { side: step.leader })}
        />
        <Steps>
          <StepItem n={1}>{t('deal.deal1')}</StepItem>
          <StepItem n={2}>{t('deal.deal2', { n: step.cardsEach })}</StepItem>
          <StepItem n={3}>{t('deal.deal3', { round: numeral(step.round) })}</StepItem>
        </Steps>
        <RuleTip title={t('deal.tipTitle')} defaultOpen>
          {t('deal.tip')}
        </RuleTip>
      </main>
      <Next label={t('deal.go')} dock={dock} onClick={() => dispatch({ type: 'dealt' })} />
    </>
  )
}
