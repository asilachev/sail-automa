/**
 * A voyage as a pure, event-sourced state machine:  state = replay(settings, events).
 * Undo drops the last event. No clock, no randomness: the table shuffles.
 *
 * Rules: docs/rules.md; the variant, the model and the rulings: docs/automa.md.
 *
 * The flow, one step at a time (see `currentStep`):
 *   exchange → trick → order → … → roundEnd → deal → exchange → … → won | lost
 * Each step waits for the user's events; `orderDone` and `roundEndDone` commit what the step
 * shows, so the step can preview its effects first.
 */
import {
  addBelow,
  attack,
  attacksAt,
  KRAKEN_START,
  krakenCards,
  type AttackEffect,
  type KrakenDeck,
  type TrackIndex,
} from './kraken.ts'
import { cannonAction, pairAction, type CardSymbol, type Move } from './orders.ts'
import { scenario } from './scenarios.ts'
import { bosunHasCannonWheel, type Settings } from './settings.ts'

export type Side = 'you' | 'bosun'
export const SIDES: readonly Side[] = ['you', 'bosun']

/** What the ship moved onto: open sea (or it didn't move), a Kraken token, the End token, past it. */
export type Token = 'open' | 'kraken' | 'end' | 'past'
export const TOKENS: readonly Token[] = ['open', 'kraken', 'end', 'past']

export type Round = 1 | 2 | 3 | 4 | 5
export const ROUNDS = 5
/** The round ends when a player wins their fourth trick (docs/rules.md → A round). */
export const TRICKS_TO_END = 4
/** Cards dealt to each player (docs/rules.md → A round). */
export const HAND = 9
/** The numbered cards: three colours, 1 to 9 (docs/rules.md → Components). */
export const NUMBERED_CARDS = 27

/** The trackers Fix the trackers sets (design D5). */
export interface Trackers {
  readonly above: number
  readonly below: number
  /** The Kraken meeple's space, 0 to 3 (the skull would already have lost). */
  readonly track: TrackIndex
  readonly playerDeck: number
}

export type VoyageEvent =
  | { readonly type: 'exchange' }
  | {
      readonly type: 'trick'
      readonly winner: Side
      readonly yours: CardSymbol
      readonly bosuns: CardSymbol
    }
  /** Cannon + Cannon: the symbol of the card flipped from the player deck. */
  | { readonly type: 'flip'; readonly symbol: CardSymbol }
  /** The token the ship moved onto, when the order moved it. */
  | { readonly type: 'ship'; readonly onto: Token }
  | { readonly type: 'orderDone' }
  /** The storm check: is the ship completely past the storm? */
  | { readonly type: 'storm'; readonly passed: boolean }
  | { readonly type: 'roundEndDone' }
  | { readonly type: 'dealt' }
  | ({ readonly type: 'fix' } & Trackers)

export type LoseReason = 'roundFive' | 'storm' | 'krakenAlone' | 'skull' | 'pastEnd'

export type VoyageResult =
  | { readonly outcome: 'won'; readonly reason: 'end'; readonly round: Round }
  | { readonly outcome: 'lost'; readonly reason: LoseReason; readonly round: Round }

type Phase = 'exchange' | 'trick' | 'order' | 'roundEnd' | 'deal' | 'over'

interface CurrentTrick {
  readonly trick: number
  readonly winner: Side
  readonly yours: CardSymbol
  readonly bosuns: CardSymbol
  readonly flips: readonly CardSymbol[]
  readonly onto: Token | null
}

/** A ship's log entry: data, not text (the UI translates). */
export type LogEntry =
  | { readonly kind: 'exchange'; readonly round: Round }
  | {
      readonly kind: 'trick'
      readonly round: Round
      readonly trick: number
      readonly winner: Side
      readonly yours: CardSymbol
      readonly bosuns: CardSymbol
      readonly flips: readonly CardSymbol[]
      readonly move: Move
      readonly onto: Token | null
      /** Cards that went to the bottom of the Kraken deck. */
      readonly toKrakenDeck: number
      readonly attacks: readonly AttackEffect[]
      /** Ruling 5 "end the round first": the fourth trick's action was not resolved. */
      readonly skipped: boolean
    }
  | { readonly kind: 'roundEnd'; readonly round: Round; readonly attacks: readonly AttackEffect[] }
  | {
      readonly kind: 'storm'
      readonly round: Round
      readonly column: number
      readonly passed: boolean
    }
  | { readonly kind: 'deal'; readonly round: Round; readonly cardsEach: number }
  | {
      readonly kind: 'fix'
      readonly round: Round
      readonly before: Trackers
      readonly after: Trackers
    }
  | { readonly kind: 'result'; readonly round: Round; readonly result: VoyageResult }

export interface VoyageState {
  readonly settings: Settings
  readonly round: Round
  readonly phase: Phase
  readonly tricks: Readonly<Record<Side, number>>
  /** Who leads the current trick, or the next one. */
  readonly leader: Side
  readonly kraken: KrakenDeck
  readonly playerDeck: number
  /** Cards dealt to each player this round (ruling 4). */
  readonly cardsEach: number
  readonly current: CurrentTrick | null
  /** The storm check's answer at this round's end, once given. */
  readonly storm: boolean | null
  readonly result: VoyageResult | null
  /** Oldest first; `shipsLog` gives it newest first. */
  readonly log: readonly LogEntry[]
}

/** Thrown for an event the rules or the step order don't allow. */
export class VoyageRuleError extends Error {
  override name = 'VoyageRuleError'
}

// ── setup and the deal ─────────────────────────────────────────────────────────────────────

/** You lead rounds I, III and V; the Bosun leads II and IV (docs/automa.md → Setup). */
export const firstLeader = (round: Round): Side => (round % 2 === 1 ? 'you' : 'bosun')

/**
 * The deal from the cards outside the Kraken deck: 9 each, or evenly as far as the deck goes
 * (ruling 4). An odd card left over stays in the player deck.
 */
export function deal(kraken: KrakenDeck): {
  readonly cardsEach: number
  readonly playerDeck: number
} {
  const pool = Math.max(0, NUMBERED_CARDS - krakenCards(kraken))
  const cardsEach = Math.min(HAND, Math.floor(pool / 2))
  return { cardsEach, playerDeck: pool - 2 * cardsEach }
}

export function newVoyage(settings: Settings): VoyageState {
  return {
    settings,
    round: 1,
    phase: 'exchange',
    tricks: { you: 0, bosun: 0 },
    leader: firstLeader(1),
    kraken: KRAKEN_START,
    ...deal(KRAKEN_START),
    current: null,
    storm: null,
    result: null,
    log: [],
  }
}

export function replay(settings: Settings, events: readonly VoyageEvent[]): VoyageState {
  return events.reduce(applyEvent, newVoyage(settings))
}

/** Undo: the events without the last one. */
export const undo = (events: readonly VoyageEvent[]): readonly VoyageEvent[] => events.slice(0, -1)

/** Whether `event` is allowed now. */
export function canApply(state: VoyageState, event: VoyageEvent): boolean {
  try {
    applyEvent(state, event)
    return true
  } catch (e) {
    if (e instanceof VoyageRuleError) return false
    throw e
  }
}

// ── the order ─────────────────────────────────────────────────────────────────────────────

export interface CannonView {
  /** The symbols flipped so far, in order. */
  readonly flips: readonly CardSymbol[]
  /** Another flip is needed: ask for its symbol. */
  readonly needed: boolean
  /** Cards left in the player deck, after the flips so far. */
  readonly deckLeft: number
  /** The deck ran out while a flip was due: no (further) effect (docs/rules.md → Actions). */
  readonly emptyDeck: boolean
}

export interface PirateView {
  /** The trick's winner, who may use a Pirate card. */
  readonly winner: Side
  /** The winner has a Pirate card to use (docs/automa.md → Difficulty). */
  readonly mayUse: boolean
  /** Ruling 2: you decide for the Bosun. */
  readonly decidedBy: 'you'
  /** The winner may use the Bosun's Cannon + Wheel pirate (ruling 3). */
  readonly cannonWheel: boolean
  /** The Bosun may use it: offer the special note's swap (screen-only, no event). */
  readonly swap: boolean
}

export interface OrderView {
  readonly winner: Side
  readonly yours: CardSymbol
  readonly bosuns: CardSymbol
  /** The move, after any cannon flips. */
  readonly move: Move
  /** Attacks: the pair's damage, plus one for a Kraken token once the ship landed on it. */
  readonly attacks: number
  /** Each attack's effect on the Kraken deck as it stands; stops at a loss. */
  readonly attackEffects: readonly AttackEffect[]
  /** Cards going to the bottom of the Kraken deck: Helm & Kraken + Cannon, or a flipped H&K. */
  readonly toKrakenDeck: number
  /** Helm & Kraken + Cannon: the pair damages the Kraken. */
  readonly krakenHit: boolean
  /** Cannon + Cannon only. */
  readonly cannon: CannonView | null
  /** The token question applies: the order moves the ship. */
  readonly asksToken: boolean
  readonly onto: Token | null
  /** What the step waits for before `orderDone`. */
  readonly awaiting: 'flip' | 'ship' | null
  /** The result `orderDone` will give, once nothing is awaited. */
  readonly outcome: VoyageResult | null
  /** This trick ends the round (a fourth trick, or the hands ran out). */
  readonly endsRound: boolean
  readonly pirate: PirateView
}

const lost = (reason: LoseReason, round: Round): VoyageResult => ({
  outcome: 'lost',
  reason,
  round,
})

function endsRound(state: VoyageState): boolean {
  const played = state.tricks.you + state.tricks.bosun
  return (
    state.tricks.you >= TRICKS_TO_END ||
    state.tricks.bosun >= TRICKS_TO_END ||
    // The hands ran out before anyone won four: only after a short deal (ruling 4).
    played >= state.cardsEach
  )
}

function pirateView(settings: Settings, winner: Side): PirateView {
  const cw = bosunHasCannonWheel(settings)
  const cannonWheel =
    winner === 'bosun'
      ? cw
      : cw && (settings.difficulty === 'easy' || settings.rulings.cannonWheel === 'anyWinner')
  return {
    winner,
    mayUse: settings.difficulty !== 'hard' || winner === 'you',
    decidedBy: settings.rulings.bosunPirate,
    cannonWheel,
    swap: winner === 'bosun' && cannonWheel,
  }
}

/** The order for the current trick, from its symbols and the answers so far. */
function orderView(state: VoyageState, c: CurrentTrick): OrderView {
  const pair = pairAction(c.yours, c.bosuns)
  let move = pair.move
  let toKrakenDeck = pair.krakenHit ? 1 : 0
  let cannon: CannonView | null = null
  let awaiting: OrderView['awaiting'] = null

  if (pair.cannon) {
    let again = true
    for (const symbol of c.flips) {
      const action = cannonAction(symbol)
      if (action.toKrakenDeck) toKrakenDeck++
      if (action.move !== 'none') move = action.move
      again = action.again
    }
    const deckLeft = Math.max(0, state.playerDeck - c.flips.length)
    const needed = again && deckLeft > 0
    cannon = { flips: c.flips, needed, deckLeft, emptyDeck: again && deckLeft === 0 }
    if (needed) awaiting = 'flip'
  }

  const asksToken = awaiting === null && move !== 'none'
  if (asksToken && c.onto === null) awaiting = 'ship'

  const attacks = pair.damage + (c.onto === 'kraken' ? 1 : 0)
  const hit = attack(addBelow(state.kraken, toKrakenDeck), attacks)

  let outcome: VoyageResult | null = null
  if (awaiting === null) {
    // "If you sail the ship onto the End Token, you immediately win" (EN p.4): before the damage.
    if (c.onto === 'end') outcome = { outcome: 'won', reason: 'end', round: state.round }
    else if (c.onto === 'past' && state.settings.rulings.pastEnd === 'lose')
      outcome = lost('pastEnd', state.round)
    else if (hit.lost) outcome = lost(hit.lost, state.round)
  }

  return {
    winner: c.winner,
    yours: c.yours,
    bosuns: c.bosuns,
    move,
    attacks,
    attackEffects: hit.effects,
    toKrakenDeck,
    krakenHit: pair.krakenHit,
    cannon,
    asksToken,
    onto: c.onto,
    awaiting,
    outcome,
    endsRound: endsRound(state),
    pirate: pirateView(state.settings, c.winner),
  }
}

// ── round end ─────────────────────────────────────────────────────────────────────────────

export interface StormView {
  /** 0: the first storm (after round II), 1: the second (after round IV). */
  readonly index: 0 | 1
  /** The storm's column on the ocean board, from the scenario. */
  readonly column: number
  /** The answer, once given. */
  readonly passed: boolean | null
}

export interface RoundEndView {
  /** The number under the meeple as the round ends (docs/automa.md → The engine's model). */
  readonly attacks: number
  /** Each attack's effect, in order; stops at a loss. */
  readonly attackEffects: readonly AttackEffect[]
  /** Where the meeple ends up. */
  readonly track: TrackIndex
  /** The storm check, when this round has one and the attacks didn't already lose. */
  readonly storm: StormView | null
  /** The result `roundEndDone` will give, as far as it is known. */
  readonly outcome: VoyageResult | null
  /** `roundEndDone` is allowed: the storm check, if any, is answered. */
  readonly ready: boolean
}

/** The storm checked at the end of `round`: storms[0] after II, storms[1] after IV. */
export function stormAfter(settings: Settings, round: Round): StormView | null {
  const index = round === 2 ? 0 : round === 4 ? 1 : null
  if (index === null) return null
  const column = scenario(settings.scenario).storms[index]
  return column === undefined ? null : { index, column, passed: null }
}

function roundEndView(state: VoyageState): RoundEndView {
  const attacks = attacksAt(state.kraken.track) ?? 0
  const hit = attack(state.kraken, attacks)
  const check = hit.lost ? null : stormAfter(state.settings, state.round)
  const storm = check && { ...check, passed: state.storm }
  let outcome: VoyageResult | null = null
  if (hit.lost) outcome = lost(hit.lost, state.round)
  else if (storm?.passed === false) outcome = lost('storm', state.round)
  else if (state.round === ROUNDS) outcome = lost('roundFive', state.round)
  return {
    attacks,
    attackEffects: hit.effects,
    track: hit.deck.track,
    storm,
    outcome,
    ready: storm === null || storm.passed !== null,
  }
}

// ── the step the UI renders ───────────────────────────────────────────────────────────────

export type Step =
  | {
      readonly kind: 'exchange'
      readonly round: Round
      readonly leader: Side
      readonly cardsEach: number
    }
  | { readonly kind: 'trick'; readonly round: Round; readonly trick: number; readonly leader: Side }
  | {
      readonly kind: 'order'
      readonly round: Round
      readonly trick: number
      readonly order: OrderView
    }
  | ({ readonly kind: 'roundEnd'; readonly round: Round } & RoundEndView)
  | {
      readonly kind: 'deal'
      readonly round: Round
      readonly leader: Side
      readonly cardsEach: number
    }
  | { readonly kind: 'won'; readonly round: Round; readonly reason: 'end' }
  | { readonly kind: 'lost'; readonly round: Round; readonly reason: LoseReason }

export function currentStep(state: VoyageState): Step {
  const { round, leader, cardsEach } = state
  switch (state.phase) {
    case 'exchange':
      return { kind: 'exchange', round, leader, cardsEach }
    case 'trick':
      return { kind: 'trick', round, trick: state.tricks.you + state.tricks.bosun + 1, leader }
    case 'order': {
      const c = state.current!
      return { kind: 'order', round, trick: c.trick, order: orderView(state, c) }
    }
    case 'roundEnd':
      return { kind: 'roundEnd', round, ...roundEndView(state) }
    case 'deal':
      return { kind: 'deal', round, leader, cardsEach }
    case 'over': {
      const r = state.result!
      return r.outcome === 'won'
        ? { kind: 'won', round: r.round, reason: r.reason }
        : { kind: 'lost', round: r.round, reason: r.reason }
    }
  }
}

export interface Hud {
  readonly round: Round
  readonly tricks: Readonly<Record<Side, number>>
  /** Who leads the current or the next trick. */
  readonly leader: Side
  readonly kraken: {
    readonly above: number
    readonly below: number
    /** The numbered cards in the Kraken deck, the Kraken card not counted: "6 cards left". */
    readonly cards: number
  }
  readonly track: TrackIndex
  /** The number under the meeple; null on the skull. */
  readonly attacksAtRoundEnd: number | null
  readonly playerDeck: number
  readonly cardsEach: number
}

/** The HUD at any step: the committed trackers (an order's preview isn't applied yet). */
export function hud(state: VoyageState): Hud {
  const { above, below, track } = state.kraken
  return {
    round: state.round,
    tricks: state.tricks,
    leader: state.leader,
    kraken: { above, below, cards: above + below },
    track,
    attacksAtRoundEnd: attacksAt(track),
    playerDeck: state.playerDeck,
    cardsEach: state.cardsEach,
  }
}

/** The trackers as Fix the trackers shows them. */
export const trackers = (state: VoyageState): Trackers => ({
  above: state.kraken.above,
  below: state.kraken.below,
  track: state.kraken.track,
  playerDeck: state.playerDeck,
})

/** The ship's log, newest first. */
export const shipsLog = (state: VoyageState): readonly LogEntry[] => [...state.log].reverse()

// ── the reducer ───────────────────────────────────────────────────────────────────────────

function expectPhase(state: VoyageState, phase: Phase, event: VoyageEvent): void {
  if (state.phase !== phase) {
    throw new VoyageRuleError(`"${event.type}" needs the ${phase} step, not ${state.phase}`)
  }
}

const log = (state: VoyageState, ...entries: LogEntry[]): readonly LogEntry[] => [
  ...state.log,
  ...entries,
]

function finish(state: VoyageState, result: VoyageResult, entries: LogEntry[]): VoyageState {
  return {
    ...state,
    phase: 'over',
    current: null,
    result,
    log: log(state, ...entries, { kind: 'result', round: result.round, result }),
  }
}

export function applyEvent(state: VoyageState, event: VoyageEvent): VoyageState {
  if (state.phase === 'over') throw new VoyageRuleError('The voyage is over')
  switch (event.type) {
    case 'exchange':
      expectPhase(state, 'exchange', event)
      return {
        ...state,
        // Ruling 4: a deal with no cards leaves nothing to play.
        phase: state.cardsEach === 0 ? 'roundEnd' : 'trick',
        log: log(state, { kind: 'exchange', round: state.round }),
      }
    case 'trick':
      return trick(state, event)
    case 'flip': {
      expectPhase(state, 'order', event)
      const c = state.current!
      if (orderView(state, c).awaiting !== 'flip') throw new VoyageRuleError('No flip is due')
      return { ...state, current: { ...c, flips: [...c.flips, event.symbol] } }
    }
    case 'ship': {
      expectPhase(state, 'order', event)
      const c = state.current!
      if (orderView(state, c).awaiting !== 'ship') {
        throw new VoyageRuleError('The order does not ask where the ship moved')
      }
      return { ...state, current: { ...c, onto: event.onto } }
    }
    case 'orderDone':
      return orderDone(state, event)
    case 'storm': {
      expectPhase(state, 'roundEnd', event)
      if (roundEndView(state).storm === null) throw new VoyageRuleError('No storm check now')
      return { ...state, storm: event.passed }
    }
    case 'roundEndDone':
      return roundEndDone(state, event)
    case 'dealt':
      expectPhase(state, 'deal', event)
      return {
        ...state,
        phase: 'exchange',
        log: log(state, { kind: 'deal', round: state.round, cardsEach: state.cardsEach }),
      }
    case 'fix':
      return fix(state, event)
  }
}

function trick(state: VoyageState, event: Extract<VoyageEvent, { type: 'trick' }>): VoyageState {
  expectPhase(state, 'trick', event)
  const { winner, yours, bosuns } = event
  const number = state.tricks.you + state.tricks.bosun + 1
  // The winner's trick cube advances, and they lead the next trick.
  const next: VoyageState = {
    ...state,
    tricks: { ...state.tricks, [winner]: state.tricks[winner] + 1 },
    leader: winner,
  }
  if (endsRound(next) && state.settings.rulings.fourthTrick === 'endFirst') {
    // Ruling 5, the alternative: the round ends before the fourth trick's action.
    const entry: LogEntry = {
      kind: 'trick',
      round: state.round,
      trick: number,
      winner,
      yours,
      bosuns,
      flips: [],
      move: 'none',
      onto: null,
      toKrakenDeck: 0,
      attacks: [],
      skipped: true,
    }
    return { ...next, phase: 'roundEnd', storm: null, log: log(state, entry) }
  }
  return {
    ...next,
    phase: 'order',
    current: { trick: number, winner, yours, bosuns, flips: [], onto: null },
  }
}

function orderDone(state: VoyageState, event: VoyageEvent): VoyageState {
  expectPhase(state, 'order', event)
  const c = state.current!
  const order = orderView(state, c)
  if (order.awaiting) throw new VoyageRuleError(`The order still needs a ${order.awaiting}`)
  const entry: LogEntry = {
    kind: 'trick',
    round: state.round,
    trick: c.trick,
    winner: c.winner,
    yours: c.yours,
    bosuns: c.bosuns,
    flips: c.flips,
    move: order.move,
    onto: c.onto,
    toKrakenDeck: order.toKrakenDeck,
    // The End token wins at once, and sailing past it loses at once: no damage follows.
    attacks: c.onto === 'end' || order.outcome?.reason === 'pastEnd' ? [] : order.attackEffects,
    skipped: false,
  }
  const kraken = attack(addBelow(state.kraken, order.toKrakenDeck), order.attacks).deck
  const next: VoyageState = {
    ...state,
    kraken: c.onto === 'end' || order.outcome?.reason === 'pastEnd' ? state.kraken : kraken,
    playerDeck: Math.max(0, state.playerDeck - c.flips.length),
    current: null,
  }
  if (order.outcome) return finish(next, order.outcome, [entry])
  return {
    ...next,
    phase: order.endsRound ? 'roundEnd' : 'trick',
    storm: null,
    log: log(state, entry),
  }
}

function roundEndDone(state: VoyageState, event: VoyageEvent): VoyageState {
  expectPhase(state, 'roundEnd', event)
  const view = roundEndView(state)
  if (!view.ready) throw new VoyageRuleError('Answer the storm check first')
  const kraken = attack(state.kraken, view.attacks).deck
  const entries: LogEntry[] = [
    { kind: 'roundEnd', round: state.round, attacks: view.attackEffects },
  ]
  if (view.storm && view.storm.passed !== null) {
    entries.push({
      kind: 'storm',
      round: state.round,
      column: view.storm.column,
      passed: view.storm.passed,
    })
  }
  const after: VoyageState = { ...state, kraken }
  if (view.outcome) return finish(after, view.outcome, entries)
  // Advance the round disc, reset the trick cubes, reshuffle and deal (docs/rules.md → A round).
  const round = (state.round + 1) as Round
  return {
    ...after,
    round,
    phase: 'deal',
    tricks: { you: 0, bosun: 0 },
    leader: firstLeader(round),
    ...deal(kraken),
    storm: null,
    log: log(state, ...entries),
  }
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/** Fix the trackers (design D5): make the app match the table. */
function fix(state: VoyageState, event: Extract<VoyageEvent, { type: 'fix' }>): VoyageState {
  const { above, below, track, playerDeck } = event
  if (![above, below, track, playerDeck].every(isCount)) {
    throw new VoyageRuleError('Trackers are whole numbers, 0 or more')
  }
  if (track > 3) throw new VoyageRuleError('The Kraken stands on 3, 3, 4 or 5')
  if (above + below === 0) {
    throw new VoyageRuleError('The Kraken deck holds at least one numbered card')
  }
  if (above + below + playerDeck > NUMBERED_CARDS) {
    throw new VoyageRuleError(`The game has ${NUMBERED_CARDS} numbered cards`)
  }
  const before = trackers(state)
  const after: Trackers = { above, below, track, playerDeck }
  return {
    ...state,
    kraken: { above, below, track },
    playerDeck,
    log: log(state, { kind: 'fix', round: state.round, before, after }),
  }
}
