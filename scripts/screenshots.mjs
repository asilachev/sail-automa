// Captures the app's screenshots from the production build, in two sets:
//
//   npm run shots         the user guide's, one per step of a voyage, into docs/guide/screenshots/
//   npm run site:shots    the landing page's (site/shots.json), per language, into
//                         .screenshots/<lang>/<id>.png; scripts/build-site.mjs copies them
//
// Both build first, then serve dist/ with `vite preview`. Every shot is a 390×844 phone screen at
// 2×, so every PNG is exactly 780×1688; the script fails if any differs. Each shot starts from a
// fresh browser whose storage is seeded the way the app saves it: the voyage is the engine's
// `toSave(...)` of a fixture script (src/engine/fixtures.ts), plus the preferences and the
// captain's log, so reruns match. Then it taps through, finding buttons by their names in the
// shot's language. It drives the installed Google Chrome through playwright-core (set CHROME_PATH
// to use another Chromium). Modelled on splendor-marvel-automa's scripts/screenshots.mjs (#12).
//
// Options, e.g. `npm run shots -- --lang ru,de --only 07,08` or `npm run site:shots -- --lang ru`:
//   --site               the landing page's set instead of the guide's
//   --lang es,de,ru,sr   the app's languages (the guide's default is en, the landing page's all five)
//   --only 07,08-order   shots whose names start with these
//   --out <dir>          where to write, with a folder per language when there are several
//                        (default: the guide in English goes to docs/guide/screenshots, in other
//                        languages to .screenshots/guide/<lang>; the landing page to
//                        .screenshots/<lang>)
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'
import { preview } from 'vite'
import { fromScript, KRAKEN_HIT_ROUND, toSave } from '../src/engine/index.ts'
import { formatMessage, parseMessage } from '../src/ui/i18n/icu.ts'
import { typeset } from '../src/ui/i18n/typography.ts'

const { values: opt } = parseArgs({
  options: {
    site: { type: 'boolean', default: false },
    lang: { type: 'string' },
    only: { type: 'string' },
    out: { type: 'string' },
  },
})
const root = fileURLToPath(new URL('..', import.meta.url))
const LANGS = (opt.lang ?? (opt.site ? 'en,es,de,ru,sr' : 'en')).split(',').map((l) => l.trim())
/** BCP 47 tags, as in LANGS in src/ui/i18n/index.ts. */
const TAGS = { en: 'en', es: 'es', de: 'de', ru: 'ru', sr: 'sr-Cyrl' }
for (const lang of LANGS) if (!(lang in TAGS)) throw new Error(`Unknown language ${lang}`)
const manifest = JSON.parse(await readFile(`${root}site/shots.json`, 'utf8'))
const VIEWPORT = { width: manifest.size.width, height: manifest.size.height }
const SCALE = manifest.size.scale
const SIZE = { width: VIEWPORT.width * SCALE, height: VIEWPORT.height * SCALE }
if (SIZE.width !== 780 || SIZE.height !== 1688) throw new Error('Shots are 780×1688 (#12)')

/** English guide shots go to the guide's folder unless --out says otherwise. */
const isGuide = (lang) => !opt.site && !opt.out && lang === 'en'
const outFor = (lang) => {
  if (opt.out) return `${resolve(opt.out)}/${LANGS.length > 1 ? `${lang}/` : ''}`
  if (opt.site) return `${root}.screenshots/${lang}/`
  return isGuide(lang) ? `${root}docs/guide/screenshots/` : `${root}.screenshots/guide/${lang}/`
}

// The keys the app saves under (src/ui/state/voyage.ts, prefs.ts, history.ts).
const VOYAGE_KEY = 'bosun:v1:voyage'
const PREFS_KEY = 'bosun:v1:prefs'
const LOG_KEY = 'bosun:v1:log'

// ---- The app's texts ---------------------------------------------------------------------------

/** The app's texts in a language, typeset as the app shows them. */
async function translator(lang) {
  const catalog = JSON.parse(await readFile(`${root}src/ui/i18n/locales/${lang}.json`, 'utf8'))
  const plural = new Intl.PluralRules(TAGS[lang])
  return (key, vars = {}) => {
    const message = key.split('.').reduce((node, part) => node?.[part], catalog)
    if (typeof message !== 'string') throw new Error(`No text for ${key} in ${lang}`)
    return typeset(
      lang,
      formatMessage(parseMessage(message), vars, (n) => plural.select(n)),
    )
  }
}
const pattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ \u00a0]/g, '\\s')
/** Names that start with a text, whichever spaces the text uses. */
const startsWith = (text) => new RegExp(`^${pattern(text.trim())}`)

// ---- Voyages -----------------------------------------------------------------------------------

/** A saved voyage from an engine script, as the app writes it after every tap. */
const voyage = (script, settings = {}) => {
  const v = fromScript(script, settings)
  return toSave(v.settings, v.events)
}
const SCENARIO_3 = { scenario: 3 }
/**
 * Round III, trick 5, You 2 · Bosun 2, in scenario 3, with the Kraken deck at 4 cards and 4 attacks
 * at round end (design A3). Played with a mix of orders, so the ship's log has something to show.
 */
const ROUND_III = voyage(
  [
    'x Ykc . Bhh @o . Ykc . Ytt @o . Yhk @o . e',
    'd x Bth . Ycc ft @o . Bkh @o . Bhc . Bht . s+ e',
    'd x Yhh @o . Bkt . Y! Bcc fh @o . fix:3,1,2,4',
  ].join(' '),
  SCENARIO_3,
)
/** Round II's storm check (fixture roundEndStorm), the answer still open. */
const STORM = voyage(`${KRAKEN_HIT_ROUND} e d x B!*4`, SCENARIO_3)

/** A made-up captain's log, newest first (design E3). */
const LOG = {
  version: 1,
  entries: [
    ['2026-11-22T20:10', 3, 'medium', 'won', 'end', 4],
    ['2026-11-21T19:40', 3, 'medium', 'lost', 'storm', 2],
    ['2026-11-19T21:05', 2, 'medium', 'won', 'end', 5],
    ['2026-11-17T18:30', 2, 'hard', 'lost', 'krakenAlone', 3],
    ['2026-11-15T20:00', 1, 'easy', 'won', 'end', 3],
    ['2026-11-14T19:15', 'learning', 'easy', 'won', 'end', 2],
  ].map(([date, scenario, difficulty, outcome, reason, round], i) => ({
    id: `demo-${i}`,
    date: `${date}:00.000Z`,
    settings: { scenario, difficulty },
    outcome,
    reason,
    round,
  })),
}

// ---- Shots -------------------------------------------------------------------------------------

/**
 * The shots, finding buttons by their names in T's language. Each is `[seed, act]`: the storage
 * before the app loads (`voyage`, `prefs`, `log`), then the taps from Home.
 */
function shotsFor(T) {
  const top = (page) => page.evaluate(() => window.scrollTo(0, 0))
  const tap = (page, name, options = {}) =>
    page.getByRole('button', { name, exact: true, ...options }).click()
  const resume = (page) =>
    page.getByRole('button', { name: startsWith(T('home.continue', { round: '' })) }).click()
  const dock = (key) => async (page) => {
    await resume(page)
    await page
      .getByRole('navigation', { name: T('dock.label') })
      .getByRole('button', { name: T(key) })
      .click()
  }
  const done = (page) => page.getByRole('button', { name: startsWith(T('trick.done')) }).click()
  const pick = (page, group, name) =>
    page
      .getByRole('group', { name: T(group) })
      .getByRole('button', { name, exact: true })
      .click()
  /** New voyage (B1) from Home's first visit. */
  const newVoyage = (page) => tap(page, T('home.start'))
  /** Set up the table (B2, B3), ticking the first `n` lines. */
  const setup =
    (n = Infinity) =>
    async (page) => {
      await newVoyage(page)
      await tap(page, T('newVoyage.next'))
      const boxes = page.getByRole('checkbox')
      const count = Math.min(n, await boxes.count())
      for (let i = 0; i < count; i++) await boxes.nth(i).click()
      await top(page)
    }
  /** Trick 1: the Bosun took it, Helm & Kraken against its Helm (C4). */
  const whoTookIt = async (page) => {
    await resume(page)
    await tap(page, T('trick.hide'))
    await pick(page, 'trick.whoLabel', T('common.bosun'))
    await pick(page, 'trick.yourCard', T('symbols.helmKraken'))
    await pick(page, 'trick.bosunCard', T('symbols.helm'))
  }
  const played = { played: true }

  const GUIDE = {
    '01-home': [{}],
    '02-new-voyage': [{}, newVoyage],
    '03-setup': [{}, setup(4)],
    '04-exchange': [{ voyage: voyage(''), prefs: played }, resume],
    '05-you-lead': [{ voyage: voyage('x'), prefs: played }, resume],
    '06-bosun-leads': [{ voyage: voyage('x B!'), prefs: played }, resume],
    '07-who-took-it': [{ voyage: voyage('x'), prefs: played }, whoTookIt],
    '08-order': [
      { voyage: voyage('x'), prefs: played },
      async (page) => {
        await whoTookIt(page)
        await done(page)
        await top(page)
      },
    ],
    '09-cannon': [{ voyage: voyage('x Ycc'), prefs: played }, resume],
    '10-round-end': [{ voyage: STORM, prefs: played }, resume],
    '11-new-deal': [{ voyage: voyage('x Y!*4 e'), prefs: played }, resume],
    '12-menu': [{ voyage: ROUND_III, prefs: played, log: LOG }, dock('dock.menu')],
    '13-ships-log': [{ voyage: ROUND_III, prefs: played, log: LOG }, dock('dock.log')],
    '14-fix': [
      { voyage: ROUND_III, prefs: played, log: LOG },
      async (page) => {
        await dock('dock.menu')(page)
        await page.getByRole('button', { name: startsWith(T('gameMenu.fix')) }).click()
        // One change, so Save fixes is ready (D5).
        await tap(page, T('fixTrackers.more', { label: T('fixTrackers.deck') }))
      },
    ],
    '15-land-ho': [
      { voyage: voyage('x Yhh'), prefs: played, log: LOG },
      async (page) => {
        await resume(page)
        await tap(page, T('order.tokenEnd'))
        await done(page)
        await page.getByRole('heading', { level: 1 }).waitFor()
      },
    ],
    '16-kraken-wins': [
      { voyage: STORM, prefs: played, log: LOG },
      async (page) => {
        await resume(page)
        await tap(page, T('roundEnd.no'))
        await page.getByRole('button', { name: startsWith(T('roundEnd.nextOver')) }).click()
        await page.getByRole('heading', { level: 1 }).waitFor()
      },
    ],
    '17-captains-log': [
      { prefs: played, log: LOG },
      (page) => page.getByRole('button', { name: startsWith(T('home.log')) }).click(),
    ],
    '18-settings': [{ prefs: played, log: LOG }, (page) => tap(page, T('home.settings'))],
  }

  /** The landing page's shots, by their ids in site/shots.json. */
  const SITE = {
    '01': [{ voyage: ROUND_III, prefs: played, log: LOG }],
    '02': GUIDE['02-new-voyage'],
    '03': [{}, setup()],
    '04': GUIDE['05-you-lead'],
    '05': GUIDE['08-order'],
    '06': GUIDE['10-round-end'],
    '07': [{ voyage: ROUND_III, prefs: played, log: LOG }, dock('dock.rules')],
    '08': GUIDE['17-captains-log'],
  }
  return opt.site ? SITE : GUIDE
}

// ---- Capture -----------------------------------------------------------------------------------

async function pngSize(file) {
  const png = await readFile(file)
  if (png.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`${file} is not a PNG`)
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

const only = opt.only?.split(',').map((s) => s.trim())
const pick = (shots) =>
  Object.entries(shots).filter(([name]) => !only || only.some((o) => name.startsWith(o)))

if (opt.site) {
  // Every shot the landing page lists has a flow, and nothing else is captured.
  const flows = Object.keys(shotsFor(() => ''))
  const ids = manifest.shots.map((shot) => shot.id)
  const missing = ids.filter((id) => !flows.includes(id))
  const extra = flows.filter((id) => !ids.includes(id))
  if (missing.length || extra.length)
    throw new Error(`site/shots.json and the flows differ: ${[...missing, ...extra].join(' ')}`)
}

const server = await preview({ logLevel: 'error', preview: { port: 4174, open: false } })
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('vite preview did not start')
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  // Software rendering and a fixed colour profile, so reruns produce the same pixels.
  args: ['--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none'],
})

const failures = []
try {
  for (const lang of LANGS) {
    const T = await translator(lang)
    const selected = pick(shotsFor(T))
    if (selected.length === 0) throw new Error(`No shots match --only ${opt.only}`)
    const OUT = outFor(lang)
    const whole = isGuide(lang) && !only
    // The guide's folder is rebuilt from scratch; other folders only get the selected shots.
    if (whole) await rm(OUT, { recursive: true, force: true })
    await mkdir(OUT, { recursive: true })
    for (const [name, [seed, act]] of selected) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        colorScheme: 'light',
        locale: TAGS[lang],
      })
      const storage = {
        [PREFS_KEY]: JSON.stringify({ ...seed.prefs, language: lang }),
        ...(seed.voyage ? { [VOYAGE_KEY]: JSON.stringify(seed.voyage) } : {}),
        ...(seed.log ? { [LOG_KEY]: JSON.stringify(seed.log) } : {}),
      }
      // Seeded once per context, before the app's first load; the app's own writes then stand.
      await context.addInitScript((items) => {
        try {
          if (sessionStorage.getItem('shots:seeded')) return
          localStorage.clear()
          for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value)
          sessionStorage.setItem('shots:seeded', '1')
        } catch {
          // about:blank has no storage.
        }
      }, storage)
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      if (act) await act(page)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => [...document.images].every((img) => img.complete))
      // Let a sheet or a new screen settle (reduced motion keeps this short).
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}${name}.png`, animations: 'disabled', caret: 'hide' })
      await context.close()
      if (errors.length) failures.push(`${lang} ${name}: ${errors.join('; ')}`)
      console.log(`✓ ${LANGS.length > 1 ? `${lang} ` : ''}${name}`)
    }

    // Every screenshot has exactly the same size; the guide's folder holds exactly the set.
    const files = whole
      ? (await readdir(OUT)).filter((f) => f.endsWith('.png')).sort()
      : selected.map(([name]) => `${name}.png`)
    const wrong = []
    for (const file of files) {
      const { width, height } = await pngSize(`${OUT}${file}`)
      if (width !== SIZE.width || height !== SIZE.height) wrong.push(`${file}: ${width}×${height}`)
    }
    if (files.length !== selected.length || wrong.length > 0) {
      failures.push(
        `${lang}: expected ${selected.length} PNGs of ${SIZE.width}×${SIZE.height}`,
        ...wrong.map((w) => `  ✗ ${w}`),
      )
    } else {
      console.log(`${files.length} screenshots, all ${SIZE.width}×${SIZE.height}, in ${OUT}`)
    }
  }
} finally {
  await browser.close()
  await new Promise((done) => server.httpServer.close(done))
}
if (failures.length > 0) {
  for (const line of failures) console.error(line)
  process.exit(1)
}
