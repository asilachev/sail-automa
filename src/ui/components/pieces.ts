import type { ArtName } from './Picture.tsx'

/**
 * The game's pieces as the kit draws them. A local copy until the engine (issue #1) exports its
 * own types; then these re-export the engine's.
 */

/** A card symbol as the user taps it (AGENTS.md → Companion: symbols, never cards). */
export type CardSymbol = 'helm' | 'hk' | 'tail' | 'cannon'
export const CARD_SYMBOLS: readonly CardSymbol[] = ['helm', 'hk', 'tail', 'cannon']
export const SYMBOL_ART: Readonly<Record<CardSymbol, ArtName>> = {
  helm: 'sym-helm',
  hk: 'sym-hk',
  tail: 'sym-tail',
  cannon: 'sym-cannon',
}

/** Round numerals, I to V (docs/rules.md: five rounds). */
export const NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const
export const numeral = (round: number): string => NUMERALS[round - 1] ?? String(round)

/** The Kraken board's spaces from the start: 3, 3, 4, 5, then the skull (decisions.md). */
export const KRAKEN_TRACK = [3, 3, 4, 5, 'skull'] as const
