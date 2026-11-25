import { describe, expect, it } from 'vitest'
import { formatMessage, parseMessage, variablesOf } from './icu.ts'
import {
  createTranslator,
  detectLang,
  LANGS,
  loadCatalog,
  type Catalog,
  type Lang,
} from './index.ts'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import ru from './locales/ru.json'
import sr from './locales/sr.json'

/** The language files, typed as English: a missing key fails the typecheck here too. */
const FILES: Record<Lang, Catalog> = { en, es, de, ru, sr }
const T = Object.fromEntries(
  (Object.keys(FILES) as Lang[]).map((l) => [l, createTranslator(l, FILES[l])]),
) as Record<Lang, ReturnType<typeof createTranslator>>

/** Every string in a file, by dotted path. */
function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}.${i}`))
  if (typeof value === 'object' && value !== null)
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k))
  return []
}
const english = new Map(strings(en))
const plural = (lang: string) => {
  const rules = new Intl.PluralRules(lang)
  return (n: number) => rules.select(n)
}

describe('message format', () => {
  it('fills values, picks branches and counts with #', () => {
    const f = (msg: string, vars = {}) => formatMessage(parseMessage(msg), vars, plural('ru'))
    expect(f('ROUND {n}', { n: 7 })).toBe('ROUND 7')
    expect(f('{you, select, true {You} other {The Bosun}} won', { you: false })).toBe(
      'The Bosun won',
    )
    expect(
      f('{n, plural, =0 {none} one {# очко} few {# очка} many {# очков} other {# очка}}', { n: 0 }),
    ).toBe('none')
    expect(
      f('{n, plural, one {# очко} few {# очка} many {# очков} other {# очка}}', { n: 22 }),
    ).toBe('22 очка')
    expect(
      f('{a, select, x {{n, plural, one {# one} other {# more}}} other {-}}', { a: 'x', n: 3 }),
    ).toBe('3 more')
    expect(() => parseMessage('{n, plural, one {x}}')).toThrow(/other/)
  })
})

describe('language files', () => {
  it('detects the first supported browser language, English otherwise', () => {
    expect(detectLang(['ru-RU', 'en'])).toBe('ru')
    expect(detectLang(['sr-Latn-RS'])).toBe('sr')
    expect(detectLang(['fr-FR', 'es-419'])).toBe('es')
    expect(detectLang(['de-AT'])).toBe('de')
    expect(detectLang(['fr', 'it'])).toBe('en')
  })

  it('lists the languages as EN, ES, DE, RU, SR', () => {
    expect(LANGS.map((l) => l.code)).toEqual(['en', 'es', 'de', 'ru', 'sr'])
  })

  it('names every language in itself', () => {
    expect(LANGS.map((l) => l.name)).toEqual(['English', 'Español', 'Deutsch', 'Русский', 'Српски'])
    expect(LANGS.find((l) => l.code === 'sr')?.tag).toBe('sr-Cyrl')
  })

  it('has exactly English’s keys in every file', () => {
    const keys = [...english.keys()].sort()
    for (const lang of Object.keys(FILES) as Lang[]) {
      expect(
        strings(FILES[lang])
          .map(([k]) => k)
          .sort(),
        lang,
      ).toEqual(keys)
    }
  })

  it('parses every message and uses only English’s placeholders', () => {
    for (const lang of Object.keys(FILES) as Lang[]) {
      for (const [key, message] of strings(FILES[lang])) {
        const used = variablesOf(parseMessage(message))
        const allowed = variablesOf(parseMessage(english.get(key) ?? ''))
        expect(
          [...used].filter((v) => !allowed.has(v)),
          `${lang} ${key}`,
        ).toEqual([])
      }
    }
  })

  it('has no empty texts', () => {
    for (const lang of Object.keys(FILES) as Lang[]) {
      const empty = strings(FILES[lang]).filter(([k, s]) => !s.trim() && !k.endsWith('.hint'))
      expect(
        empty.map(([k]) => k),
        lang,
      ).toEqual([])
    }
  })

  it('connects a language’s file on demand', async () => {
    expect((await loadCatalog('de')).app.name).toBe('Bootsmann')
  })

  it('translates the persona but keeps the wordmark BOSUN (docs/decisions.md)', () => {
    expect(T.ru('app.name')).toBe('Боцман')
    expect(T.es('app.name')).toBe('Contramaestre')
    for (const lang of Object.keys(FILES) as Lang[]) expect(T[lang]('app.wordmark')).toBe('BOSUN')
  })
})
