/**
 * The Kraken: its track and its deck. docs/rules.md → The Kraken track, Kraken damage;
 * docs/automa.md → The engine's model.
 *
 * The deck is counted as the numbered cards above the Kraken card and those below it. Setup: 6
 * above (the 1s and 2s), 0 below.
 */

/** The Kraken board's spaces from the start (docs/decisions.md, 2026-11-25: 3-3-4-5-skull). */
export const TRACK = [3, 3, 4, 5, 'skull'] as const
export type TrackIndex = 0 | 1 | 2 | 3 | 4
/** The skull ("Dead"): moving onto it loses. */
export const SKULL: TrackIndex = 4

/** The Kraken deck's numbered cards at setup: the six 1s and 2s (docs/rules.md → Setup). */
export const KRAKEN_DECK_START = 6

export interface KrakenDeck {
  /** Numbered cards above the Kraken card. */
  readonly above: number
  /** Numbered cards below it. */
  readonly below: number
  /** Where the Kraken meeple stands on the track. */
  readonly track: TrackIndex
}

export const KRAKEN_START: KrakenDeck = { above: KRAKEN_DECK_START, below: 0, track: 0 }

/** The numbered cards in the Kraken deck: the HUD's "cards left" (the Kraken card not counted). */
export const krakenCards = (deck: KrakenDeck): number => deck.above + deck.below

/** Attacks at round end: the number under the meeple, or null on the skull. */
export function attacksAt(track: TrackIndex): number | null {
  const value = TRACK[track]
  return value === 'skull' ? null : value
}

export type KrakenLoss = 'skull' | 'krakenAlone'

/**
 * One attack's effect, as the UI lists it: discard the top card, or the Kraken card is on top, so
 * the meeple moves to `track` and the card goes to the bottom. Counts are after the attack.
 */
export type AttackEffect =
  | { readonly kind: 'discard'; readonly above: number; readonly below: number }
  | {
      readonly kind: 'krakenCard'
      readonly track: TrackIndex
      readonly above: number
      readonly below: number
    }

export interface Attacks {
  readonly deck: KrakenDeck
  /** One per attack made; a loss stops the attacks, so this can be shorter than asked. */
  readonly effects: readonly AttackEffect[]
  readonly lost: KrakenLoss | null
}

/**
 * The Kraken damages the ship `n` times (docs/rules.md → Kraken damage). Moving the Kraken card
 * uses up that attack; the rest go on (BGG clarification, Allplay, Aug 2023).
 */
export function attack(deck: KrakenDeck, n: number): Attacks {
  let d = deck
  const effects: AttackEffect[] = []
  for (let i = 0; i < n; i++) {
    if (d.above > 0) {
      d = { ...d, above: d.above - 1 }
      effects.push({ kind: 'discard', above: d.above, below: d.below })
    } else {
      // The Kraken card is on top: the meeple moves one space, the card goes to the bottom.
      d = { above: d.below, below: 0, track: Math.min(d.track + 1, SKULL) as TrackIndex }
      effects.push({ kind: 'krakenCard', track: d.track, above: d.above, below: d.below })
      if (d.track === SKULL) return { deck: d, effects, lost: 'skull' }
    }
    // "If the Kraken Card is ever the only card in the Kraken Deck the game is over" (EN p.3).
    if (krakenCards(d) === 0) return { deck: d, effects, lost: 'krakenAlone' }
  }
  return { deck: d, effects, lost: null }
}

/** A card added to the Kraken deck goes to its bottom, below the Kraken card. */
export const addBelow = (deck: KrakenDeck, n: number): KrakenDeck => ({
  ...deck,
  below: deck.below + n,
})
