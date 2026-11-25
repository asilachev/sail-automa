/**
 * The order for each pair of symbols, and the cannon actions of a flipped card.
 * docs/rules.md → Actions, Cannon actions (EN p.3–4). The app stores only the symbols the user
 * taps, never a card.
 */

/** A card's symbol. Named CardSymbol so it doesn't shadow the global Symbol. */
export type CardSymbol = 'helm' | 'helmKraken' | 'tail' | 'cannon'
export const CARD_SYMBOLS: readonly CardSymbol[] = ['helm', 'helmKraken', 'tail', 'cannon']

/** How the ship moves: forward and toward the trick's winner, straight forward, or not at all. */
export type Move = 'towardWinner' | 'straight' | 'none'

export interface PairAction {
  readonly move: Move
  /** Times the Kraken damages the ship, even if the ship fails to move. */
  readonly damage: 0 | 1 | 2
  /** Helm & Kraken + Cannon: the Helm & Kraken card goes to the bottom of the Kraken deck. */
  readonly krakenHit: boolean
  /** Cannon + Cannon: flip the top card of the player deck and do its cannon action. */
  readonly cannon: boolean
}

const NONE: PairAction = { move: 'none', damage: 0, krakenHit: false, cannon: false }

/** The action of a trick's two symbols, in either order (docs/rules.md → Actions). */
export function pairAction(a: CardSymbol, b: CardSymbol): PairAction {
  const has = (x: CardSymbol, y: CardSymbol) => (a === x && b === y) || (a === y && b === x)
  if (has('helm', 'helm')) return { ...NONE, move: 'towardWinner' }
  if (has('helmKraken', 'helm')) return { ...NONE, move: 'towardWinner', damage: 1 }
  if (has('helmKraken', 'helmKraken')) return { ...NONE, move: 'towardWinner', damage: 2 }
  if (has('helmKraken', 'cannon')) return { ...NONE, krakenHit: true }
  if (has('tail', 'tail')) return { ...NONE, move: 'straight' }
  if (has('cannon', 'cannon')) return { ...NONE, cannon: true }
  // Any other pair: no action, no damage; the trick cube still moves.
  return NONE
}

export interface CannonAction {
  readonly move: Move
  /** Helm & Kraken: the flipped card goes to the bottom of the Kraken deck, not the discard. */
  readonly toKrakenDeck: boolean
  /** Cannon: flip another card. */
  readonly again: boolean
}

/** The cannon action of a flipped card (docs/rules.md → Cannon actions). */
export function cannonAction(symbol: CardSymbol): CannonAction {
  switch (symbol) {
    case 'helm':
      return { move: 'towardWinner', toKrakenDeck: false, again: false }
    case 'helmKraken':
      return { move: 'none', toKrakenDeck: true, again: false }
    case 'tail':
      return { move: 'straight', toKrakenDeck: false, again: false }
    case 'cannon':
      return { move: 'none', toKrakenDeck: false, again: true }
  }
}
