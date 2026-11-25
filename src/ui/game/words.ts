import {
  firstLeader,
  type CardSymbol,
  type Move,
  type Side,
  type Step,
  type VoyageEvent,
  type VoyageState,
} from '../../engine/index.ts'
import { numeral, type Heading } from '../components/index.ts'
import { SYMBOL_ART } from '../components/pieces.ts'
import type { Translate } from '../i18n/index.ts'

export { SYMBOL_ART }

/** A symbol's name in the current language. */
export const symbolName = (t: Translate, s: CardSymbol): string => t(`symbols.${s}`)

/** "Helm & Kraken + Helm", and "· then Tail" for the cards a Cannon + Cannon flipped. */
export function pairName(
  t: Translate,
  yours: CardSymbol,
  bosuns: CardSymbol,
  flips: readonly CardSymbol[] = [],
): string {
  const pair = t('order.pair', { a: symbolName(t, yours), b: symbolName(t, bosuns) })
  if (flips.length === 0) return pair
  return t('order.thenFlips', { pair, flips: flips.map((s) => symbolName(t, s)).join(', ') })
}

/** Where the ship goes on the map: toward the trick's winner, or straight. */
export function headingOf(move: Move, winner: Side): Heading | null {
  if (move === 'none') return null
  if (move === 'straight') return 'straight'
  return winner
}

/** The toast's words for an undone step (D3 · Undone: trick 5). */
export function undoneText(t: Translate, event: VoyageEvent, now: Step): string {
  if (event.type === 'fix') return t('undo.undone', { what: 'fix', n: 0, round: 0 })
  switch (now.kind) {
    case 'trick':
    case 'order':
      return t('undo.undone', { what: 'trick', n: now.trick, round: now.round })
    case 'roundEnd':
      return t('undo.undone', { what: 'roundEnd', n: 0, round: numeral(now.round) })
    case 'deal':
      return t('undo.undone', { what: 'deal', n: 0, round: numeral(now.round) })
    case 'exchange':
      return t('undo.undone', { what: 'exchange', n: 0, round: numeral(now.round) })
    default:
      return t('undo.undone', { what: 'other', n: 0, round: 0 })
  }
}

/**
 * Whether the how-to opens by itself: the first time each round that this side leads (design
 * C2 open, C3 and C4 folded). Who led each trick comes from the round's log: the round's first
 * leader, then each trick's winner (docs/rules.md → A round).
 */
export function howToOpens(state: VoyageState, leader: Side): boolean {
  const leaders: Side[] = [firstLeader(state.round)]
  for (const entry of state.log) {
    if (entry.kind === 'trick' && entry.round === state.round) leaders.push(entry.winner)
  }
  // The last leader in the list leads the trick on screen now.
  return !leaders.slice(0, -1).includes(leader)
}
