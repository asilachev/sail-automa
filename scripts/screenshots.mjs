// Captures the app screenshots the landing page shows (site/shots.json) into
// .screenshots/<lang>/<id>.png, from the production build:
//
//   npm run site:shots       (builds first, then serves dist/ with `vite preview`)
//
// Every shot is the manifest's viewport at its scale (390×844 at 2×, so 780×1688 PNGs); the script
// fails if one differs. It drives the installed Google Chrome through playwright-core (set
// CHROME_PATH to use another Chromium).
//
// This is the minimal frame (#13): the flows that bring the app into each state come with #12,
// once the screens exist (#4–#9). Until then every shot is reported as having no flow, nothing is
// captured, and scripts/build-site.mjs shows placeholder tiles.
//
// Options, e.g. `npm run site:shots -- --lang ru,de --only 04`:
//   --lang en,es,de,ru,sr   the languages (default all five)
//   --only 04,05            the shots whose ids are listed
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values: opt } = parseArgs({
  options: {
    lang: { type: 'string', default: 'en,es,de,ru,sr' },
    only: { type: 'string' },
  },
})
const root = fileURLToPath(new URL('..', import.meta.url))
const LANGS = opt.lang.split(',').map((lang) => lang.trim())
for (const lang of LANGS)
  if (!['en', 'es', 'de', 'ru', 'sr'].includes(lang)) throw new Error(`Unknown language ${lang}`)
const manifest = JSON.parse(await readFile(`${root}site/shots.json`, 'utf8'))
const only = opt.only?.split(',').map((id) => id.trim())
const wanted = manifest.shots.filter((shot) => !only || only.includes(shot.id))
const { width, height, scale } = manifest.size

/**
 * How to reach each shot's state in the app, by id: `async (page, lang) => {}` on a page already
 * open at the app's start in that language. Filled in by #12 from fixtures, so reruns match.
 * @type {Record<string, (page: import('playwright-core').Page, lang: string) => Promise<void>>}
 */
const FLOWS = {}

const ready = wanted.filter((shot) => FLOWS[shot.id])
for (const shot of wanted.filter((s) => !FLOWS[s.id]))
  console.warn(`! No flow yet for ${shot.id} (${shot.screen}, ${shot.what}): #12`)
if (!ready.length) {
  console.log('Nothing to capture yet.')
  process.exit(0)
}

const { chromium } = await import('playwright-core')
const { preview } = await import('vite')
const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'warn' })
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4174/'
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
})
try {
  for (const lang of LANGS) {
    const dir = `${root}.screenshots/${lang}/`
    await mkdir(dir, { recursive: true })
    for (const shot of ready) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: scale,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      await page.goto(`${base}?lang=${lang}`)
      await FLOWS[shot.id](page, lang)
      await page.evaluate(() => document.fonts.ready)
      const png = await page.screenshot({ path: `${dir}${shot.id}.png` })
      const size = { w: png.readUInt32BE(16), h: png.readUInt32BE(20) }
      if (size.w !== width * scale || size.h !== height * scale)
        throw new Error(
          `${lang}/${shot.id}.png is ${size.w}×${size.h}, not ${width * scale}×${height * scale}`,
        )
      console.log(`✓ ${lang}/${shot.id}.png`)
      await context.close()
    }
  }
} finally {
  await browser.close()
  await new Promise((done) => server.httpServer.close(done))
}
