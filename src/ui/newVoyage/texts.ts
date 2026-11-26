import {
  DEFAULT_SETTINGS,
  RULING_OPTIONS,
  cannonWheelHolder,
  scenario,
  type Rulings,
  type Settings,
} from '../../engine/index.ts'
import { LANGS, type MessageKey, type Translate } from '../i18n/index.ts'
import { loadLastSettings } from '../state/lastSettings.ts'

/** The settings New voyage and Set up the table work from: the last ones, or the defaults. */
export const draftSettings = (): Settings => loadLastSettings() ?? DEFAULT_SETTINGS

/** The text of one ruling's option, e.g. `rulings.pastEnd.lose`. */
export const rulingKey = <K extends keyof Rulings>(key: K, value: Rulings[K]): MessageKey =>
  `rulings.${key}.${value}` as MessageKey

/** The option after the current one, round the list (the default comes first). */
export function nextOption<K extends keyof Rulings>(key: K, value: Rulings[K]): Rulings[K] {
  const options = RULING_OPTIONS[key]
  return options[(options.indexOf(value) + 1) % options.length] ?? value
}

/** Which Pirate cards to lay out (docs/automa.md → Difficulty), and the Cannon + Wheel's place. */
function pirates(settings: Settings): string {
  const holder = cannonWheelHolder(settings)
  if (holder === 'none') return settings.difficulty
  // easyCw (in the shared pair), mediumCw (the Bosun's), mediumCwYou, hardCwYou.
  return `${settings.difficulty}Cw${holder === 'you' ? 'You' : ''}`
}

/**
 * The nine lines of the table's setup: the rulebook's steps (docs/rules.md → Setup) with the
 * variant's changes (docs/automa.md → Setup). Line 2 lists the chosen scenario's tokens from the
 * Scenario Book; line 3 the Pirate cards by difficulty. Line 5 is always you: you lead round I
 * (the engine's `firstLeader(1)`).
 */
export function setupLines(t: Translate, lang: string, settings: Settings): readonly string[] {
  const s = scenario(settings.scenario)
  const tag = LANGS.find((l) => l.code === lang)?.tag ?? lang
  const and = new Intl.ListFormat(tag, { type: 'conjunction' })
  const lines: string[] = []
  for (let n = 1; n <= 9; n++) {
    const key = `setup.line${n}` as MessageKey
    if (n === 2) {
      lines.push(
        t(key, {
          scenario: s.id,
          islands: s.islands.join(', '),
          kraken: s.kraken.join(', '),
          end: s.end.join(', '),
          storms: s.storms.length,
          columns: and.format(s.storms.map(String)),
        }),
      )
    } else if (n === 3) {
      lines.push(t(key, { pirates: pirates(settings) }))
    } else {
      lines.push(t(key))
    }
  }
  return lines
}
