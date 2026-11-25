import { numeral } from '../components/index.ts'
import { LANGS, type Lang, type Translate } from '../i18n/index.ts'
import type { VoyageRecord } from '../state/history.ts'

/** "Scenario 3 · Medium", "Learning · Easy" (design E1 → Logged, E3 → Recent voyages). */
export const voyageName = (
  t: Translate,
  settings: { readonly scenario: string | number; readonly difficulty: string },
): string =>
  t('captainsLog.voyage', { scenario: String(settings.scenario), difficulty: settings.difficulty })

/** A recent voyage's outcome tag: "Land in IV", "Kraken in III", "Storm after II". */
export const outcomeTag = (t: Translate, entry: VoyageRecord): string =>
  t('captainsLog.tag', {
    outcome: entry.outcome === 'won' ? 'won' : (entry.reason ?? 'unfinished'),
    round: numeral(entry.round),
  })

/** The locale dates are written in. British English for "Thu 19 Nov", as the design writes it. */
const dateLocale = (lang: Lang): string =>
  lang === 'en' ? 'en-GB' : (LANGS.find((l) => l.code === lang)?.tag ?? lang)

/** "Thu 19 Nov", in the phone's time zone. */
export const voyageDate = (lang: Lang, iso: string): string =>
  new Intl.DateTimeFormat(dateLocale(lang), { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace(',', '')

/** "2 Nov", for "since 2 Nov". */
export const shortDate = (lang: Lang, iso: string): string =>
  new Intl.DateTimeFormat(dateLocale(lang), { day: 'numeric', month: 'short' }).format(
    new Date(iso),
  )

/** "42%", "42 %" in German: the language's own percent sign and spacing. */
export const percent = (lang: Lang, share: number): string =>
  new Intl.NumberFormat(dateLocale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(
    share,
  )
