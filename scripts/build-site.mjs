// Assembles the GitHub Pages landing page into _site/, once per language (#13), as
// splendor-marvel-automa builds its own:
//
//   _site/index.html          English, from the template site/index.html and site/locales/en.json
//   _site/{es,de,ru,sr}/      the other languages
//   _site/screenshots/<lang>/ the app in that language, from .screenshots/<lang> (npm run site:shots)
//
//   npm run site:shots && npm run site     then preview with: npx vite preview --outDir _site
//
// Fails if a language misses a text, the page references a file that isn't there, a placeholder
// is left over or a screenshot has the wrong size. Russian texts get the app's typography
// (src/ui/i18n/typography.ts). The design is ~/Graphics/sail-automa.pen → L1 and L2.
import { createHash } from 'node:crypto'
import { cp, mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { typeset } from '../src/ui/i18n/typography.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = `${root}_site/`
const SITE_URL = 'https://bosun.silachev.com/'
const STORAGE_KEY = 'bosun-site:lang'

/**
 * Missing screenshots: while the app's screens are still being built (#4–#9) and the capture
 * flows come with #12, a missing file becomes a marked placeholder tile and a warning. Once every
 * shot exists, set this to true (or run with SITE_REQUIRE_SHOTS=1) so a missing one fails the
 * build, as the public layer asks.
 */
const REQUIRE_SHOTS = process.env.SITE_REQUIRE_SHOTS === '1' || false

/** The languages, in the languages layer's order; English lives at the root. */
const LANGS = [
  { code: 'en', name: 'English', tag: 'en', locale: 'en_GB' },
  { code: 'es', name: 'Español', tag: 'es', locale: 'es_ES' },
  { code: 'de', name: 'Deutsch', tag: 'de', locale: 'de_DE' },
  { code: 'ru', name: 'Русский', tag: 'ru', locale: 'ru_RU' },
  { code: 'sr', name: 'Српски', tag: 'sr-Cyrl', locale: 'sr_RS' },
]
const dirOf = (code) => (code === 'en' ? '' : `${code}/`)

const PUBLISHER = 'https://allplay.com/'

/**
 * Where to buy, per page: the one place to add a shop that sells Sail to readers of that language
 * (#17). Until the owner picks them, the shop card sends every language to the publisher.
 */
const STORE = {
  // en: 'https://…',
}

const links = (code) => ({
  // The app opens in this page's language (it reads ?lang).
  app: `https://app.bosun.silachev.com/?lang=${code}`,
  github: 'https://github.com/asilachev/sail-automa',
  publisher: PUBLISHER,
  store: STORE[code] ?? PUBLISHER,
  storeHost: new URL(STORE[code] ?? PUBLISHER).host.replace(/^www\./, ''),
  bgg: 'https://boardgamegeek.com/boardgame/377470/sail',
})

/** First visit to the English page: go to the browser's language, unless one was picked here. */
const REDIRECT = `<script>
      ;(() => {
        const others = ${JSON.stringify(LANGS.map((l) => l.code).filter((c) => c !== 'en'))}
        const go = (code) => location.replace(\`\${code}/\${location.hash}\`)
        try {
          const picked = localStorage.getItem('${STORAGE_KEY}')
          if (picked) {
            if (others.includes(picked)) go(picked)
            return
          }
        } catch {
          // No storage: fall back to the browser's languages.
        }
        for (const tag of navigator.languages ?? [navigator.language]) {
          const code = String(tag).toLowerCase().split('-')[0]
          if (code === 'en') return
          if (others.includes(code)) return go(code)
        }
      })()
    </script>`

const problems = []
const missingShots = []

// ---- Texts ---------------------------------------------------------------------------------------

/** Every text in a locale file, by dotted path. */
function flatten(value, path = '', into = new Map()) {
  if (typeof value === 'string') into.set(path, value)
  else if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${path}.${i}`, into))
  else for (const [k, v] of Object.entries(value)) flatten(v, path ? `${path}.${k}` : k, into)
  return into
}
const texts = Object.fromEntries(
  await Promise.all(
    LANGS.map(async ({ code }) => [
      code,
      flatten(JSON.parse(await readFile(`${root}site/locales/${code}.json`, 'utf8'))),
    ]),
  ),
)
for (const { code } of LANGS) {
  const missing = [...texts.en.keys()].filter((k) => !texts[code].has(k))
  const extra = [...texts[code].keys()].filter((k) => !texts.en.has(k))
  if (missing.length) problems.push(`site/locales/${code}.json misses ${missing.join(', ')}`)
  if (extra.length) problems.push(`site/locales/${code}.json has unknown ${extra.join(', ')}`)
}
const text = (code, key) => {
  const value = texts[code].get(key)
  if (value === undefined) throw new Error(`site/locales/${code}.json has no text for ${key}`)
  return typeset(code, value)
}

// ---- Icons ---------------------------------------------------------------------------------------

/**
 * {{icon.scroll-fill}}: a Phosphor icon (the design's icon set), inlined from the
 * @phosphor-icons/react package the app already depends on, so the page loads no icon font.
 */
const icons = new Map()
async function icon(spec) {
  if (icons.has(spec)) return icons.get(spec)
  const parts = spec.split('-')
  const weight = parts.pop()
  const name = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join('')
  const source = await readFile(
    `${root}node_modules/@phosphor-icons/react/dist/defs/${name}.es.js`,
    'utf8',
  )
  const start = source.indexOf(`"${weight}",`)
  if (start < 0) throw new Error(`No ${weight} weight for the icon ${name}`)
  const block = source.slice(start, source.indexOf('\n  ]', start))
  const shapes = [...block.matchAll(/createElement\(\s*"(\w+)",\s*\{([^}]*)\}/g)].map(
    ([, tag, attrs]) =>
      `<${tag} ${[...attrs.matchAll(/(\w+):\s*"([^"]*)"/g)].map(([, k, v]) => `${k}="${v}"`).join(' ')} />`,
  )
  const svg = `<svg class="icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${shapes.join('')}</svg>`
  icons.set(spec, svg)
  return svg
}

// ---- Screenshots ---------------------------------------------------------------------------------

const manifest = JSON.parse(await readFile(`${root}site/shots.json`, 'utf8'))
const SHOT_SIZE = {
  width: manifest.size.width * manifest.size.scale,
  height: manifest.size.height * manifest.size.scale,
}

/** A PNG's pixel size, from its IHDR chunk. */
async function pngSize(file) {
  const handle = await open(file)
  try {
    const { buffer } = await handle.read(Buffer.alloc(24), 0, 24, 0)
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  } finally {
    await handle.close()
  }
}

/** Which shots each language has: copied into _site, checked for size. */
const present = {}
async function copyShots(code) {
  present[code] = new Set()
  await mkdir(`${out}screenshots/${code}`, { recursive: true })
  for (const { id } of manifest.shots) {
    const from = `${root}.screenshots/${code}/${id}.png`
    try {
      await stat(from)
    } catch {
      if (REQUIRE_SHOTS) problems.push(`No .screenshots/${code}/${id}.png: run npm run site:shots`)
      else missingShots.push(`${code}/${id}`)
      continue
    }
    const size = await pngSize(from)
    if (size.width !== SHOT_SIZE.width || size.height !== SHOT_SIZE.height) {
      problems.push(
        `.screenshots/${code}/${id}.png is ${size.width}×${size.height}, not ${SHOT_SIZE.width}×${SHOT_SIZE.height}`,
      )
      continue
    }
    await cp(from, `${out}screenshots/${code}/${id}.png`)
    present[code].add(id)
  }
}

/** {{shot.04}}: the screenshot, or a marked placeholder tile while it's missing. */
function shot(code, base, id) {
  const entry = manifest.shots.find((s) => s.id === id)
  if (!entry) throw new Error(`site/shots.json has no shot ${id}`)
  const alt = escapeAttribute(text(code, entry.alt))
  if (present[code].has(id))
    return (
      `<img src="${base}screenshots/${code}/${id}.png" width="${SHOT_SIZE.width}" ` +
      `height="${SHOT_SIZE.height}" loading="lazy" alt="${alt}" />`
    )
  return (
    `<span class="shot-missing" role="img" aria-label="${alt}">` +
    `<b>${id} · ${entry.screen}</b><span>${entry.what}</span><small>screenshot to come</small></span>`
  )
}

// ---- Pages ---------------------------------------------------------------------------------------

const escapeAttribute = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/** Fills {{key}}: inside a tag the value is attribute text; elsewhere it's (trusted) HTML. */
function render(template, value) {
  let html = template.replace(/<!--[\s\S]*?-->\n?/g, '')
  const fill = (escape) => (_, key) => (escape ? escapeAttribute(value(key)) : value(key))
  for (let pass = 0; pass < 3 && html.includes('{{'); pass++) {
    html = html.replace(/<[^<>]*>/g, (tag) => tag.replace(/\{\{([\w.-]+)\}\}/g, fill(true)))
    html = html.replace(/\{\{([\w.-]+)\}\}/g, fill(false))
  }
  const left = html.match(/\{\{[^}]*\}\}/)
  if (left) throw new Error(`Unknown placeholder ${left[0]}`)
  return html
}

async function page(template, lang) {
  const { code, tag, name, locale } = lang
  const base = code === 'en' ? '' : '../'
  const current = (other) => (other.code === code ? ' aria-current="page"' : '')
  const href = (other) =>
    `href="${base}${dirOf(other.code)}" hreflang="${other.tag}" lang="${other.tag}" data-lang="${other.code}"`
  const langMenu = LANGS.map(
    (other) => `<li><a ${href(other)}${current(other)}>${other.name}</a></li>`,
  ).join('\n            ')
  const langChips = LANGS.map(
    (other) =>
      `<li><a ${href(other)}${current(other)}><span class="code">${other.code.toUpperCase()}</span>` +
      `<span class="name">${other.name}</span></a></li>`,
  ).join('\n            ')
  const iconSpecs = [...template.matchAll(/\{\{icon\.([\w-]+)\}\}/g)].map((m) => m[1])
  const iconSvgs = Object.fromEntries(
    await Promise.all(iconSpecs.map(async (spec) => [`icon.${spec}`, await icon(spec)])),
  )
  const generated = {
    lang: tag,
    code,
    langName: name,
    langCode: code.toUpperCase(),
    base,
    art: `${base}art/`,
    siteUrl: SITE_URL,
    pageUrl: SITE_URL + dirOf(code),
    ogLocale: locale,
    alternates: [
      ...LANGS.map(
        (l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}${dirOf(l.code)}" />`,
      ),
      `<link rel="alternate" hreflang="x-default" href="${SITE_URL}" />`,
    ].join('\n    '),
    langMenu,
    langChips,
    redirect: code === 'en' ? REDIRECT : '',
    storageKey: STORAGE_KEY,
    cssVersion,
    ...iconSvgs,
    ...Object.fromEntries(Object.entries(links(code)).map(([k, v]) => [`links.${k}`, v])),
  }
  return render(template, (key) => {
    if (key in generated) return generated[key]
    if (key.startsWith('shot.')) return shot(code, base, key.slice('shot.'.length))
    return text(code, key)
  })
}

// ---- Files ---------------------------------------------------------------------------------------

const template = await readFile(`${root}site/index.html`, 'utf8')

// Pages may serve a cached stylesheet for 10 minutes; a URL that changes with its content makes a
// deploy load the matching CSS at once (public layer).
const cssVersion = createHash('sha256')
  .update(await readFile(`${root}site/styles.css`))
  .digest('hex')
  .slice(0, 10)

await rm(out, { recursive: true, force: true })
await mkdir(`${out}fonts`, { recursive: true })
await cp(`${root}site/styles.css`, `${out}styles.css`)
await cp(`${root}site/CNAME`, `${out}CNAME`)
// Bitter (headings) and Fira Sans Condensed (text), Latin and Cyrillic, SIL OFL, as the app.
for (const subset of ['latin', 'cyrillic']) {
  const bitter = `bitter-${subset}-wght-normal.woff2`
  await cp(
    `${root}node_modules/@fontsource-variable/bitter/files/${bitter}`,
    `${out}fonts/${bitter}`,
  )
  for (const weight of [400, 500, 600, 700]) {
    const fira = `fira-sans-condensed-${subset}-${weight}-normal.woff2`
    await cp(
      `${root}node_modules/@fontsource/fira-sans-condensed/files/${fira}`,
      `${out}fonts/${fira}`,
    )
  }
}
// Our own drawings (the K3+ kit, src/ui/assets/art/README.md) and the app's icons.
await mkdir(`${out}art`, { recursive: true })
for (const file of ['helm', 'ship', 'tentacle', 'cloud', 'island', 'sea-contours']) {
  await cp(`${root}src/ui/assets/art/${file}.svg`, `${out}art/${file}.svg`)
}
for (const file of ['sym-helm', 'sym-hk', 'sym-tail', 'sym-cannon']) {
  await cp(`${root}src/ui/assets/art/${file}.svg`, `${out}art/${file}.svg`)
}
await cp(`${root}public/favicon.svg`, `${out}favicon.svg`)
await cp(`${root}public/favicon.ico`, `${out}favicon.ico`)
await cp(`${root}public/apple-touch-icon.png`, `${out}apple-touch-icon.png`)
await cp(`${root}public/pwa-512x512.png`, `${out}icon-512.png`)

for (const lang of LANGS) {
  await copyShots(lang.code)
  await mkdir(`${out}${dirOf(lang.code)}`, { recursive: true })
  await writeFile(`${out}${dirOf(lang.code)}index.html`, await page(template, lang))
}

// Every local file a page or the stylesheet points at must exist.
let checked = 0
const check = async (file, ref) => {
  const target = new URL(ref.split('?')[0], `file://${file}`)
  checked++
  try {
    await stat(fileURLToPath(target))
  } catch {
    problems.push(`${file.slice(out.length)} points at missing ${ref}`)
  }
}
for (const lang of LANGS) {
  const file = `${out}${dirOf(lang.code)}index.html`
  const html = await readFile(file, 'utf8')
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) await check(file, ref)
}
const css = await readFile(`${out}styles.css`, 'utf8')
for (const [, ref] of css.matchAll(/url\('([^')]+)'\)/g)) await check(`${out}styles.css`, ref)

if (missingShots.length) {
  console.warn(
    `! ${missingShots.length} screenshots missing, shown as placeholder tiles ` +
      `(npm run site:shots; SITE_REQUIRE_SHOTS=1 makes this fail):\n  ${missingShots.join(' ')}`,
  )
}
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`)
  process.exit(1)
}
console.log(`_site/ ready: ${LANGS.length} languages, ${checked} local references, all present`)
