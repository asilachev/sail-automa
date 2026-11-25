import { CARD_SYMBOLS, TRACK, type CardSymbol } from '../../engine/index.ts'
import type { ArtName } from './Picture.tsx'

/** The game's pieces as the kit draws them; the values come from the engine. */
export { CARD_SYMBOLS, TRACK, type CardSymbol }

/** Each card symbol's wooden token (AGENTS.md → Companion: symbols, never cards). */
export const SYMBOL_ART: Readonly<Record<CardSymbol, ArtName>> = {
  helm: 'sym-helm',
  helmKraken: 'sym-hk',
  tail: 'sym-tail',
  cannon: 'sym-cannon',
}

/** Round numerals, I to V (docs/rules.md: five rounds). */
export const NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const
export const numeral = (round: number): string => NUMERALS[round - 1] ?? String(round)
