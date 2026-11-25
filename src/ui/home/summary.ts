import {
  currentStep,
  hud,
  type Difficulty,
  type Round,
  type ScenarioId,
  type Side,
  type VoyageState,
} from '../../engine/index.ts'

/** What Home's saved-voyage card shows (design A3 · Home · voyage in progress). */
export interface VoyageSummary {
  readonly scenario: ScenarioId
  readonly difficulty: Difficulty
  readonly round: Round
  /** The trick being played, or the last one played once the round or the voyage is over. */
  readonly trick: number
  readonly tricks: Readonly<Record<Side, number>>
  readonly kraken: { readonly above: number; readonly below: number; readonly cards: number }
  /** Attacks at the round's end; null with the Kraken on the skull. */
  readonly attacks: number | null
}

/** The saved voyage's summary, from the engine's state. */
export function voyageSummary(state: VoyageState): VoyageSummary {
  const h = hud(state)
  const step = currentStep(state)
  const played = h.tricks.you + h.tricks.bosun
  const trick =
    step.kind === 'trick' || step.kind === 'order'
      ? step.trick
      : step.kind === 'exchange' || step.kind === 'deal'
        ? played + 1
        : played
  return {
    scenario: state.settings.scenario,
    difficulty: state.settings.difficulty,
    round: h.round,
    trick,
    tricks: h.tricks,
    kraken: h.kraken,
    attacks: h.attacksAtRoundEnd,
  }
}
