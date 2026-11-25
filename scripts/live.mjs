// The `live` check (AGENTS.md → Commands): the landing page and the app serve what master built.
// Usage: npm run live [-- --app <url> --site <url>]
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const APP = arg('app', 'https://app.bosun.silachev.com/')
const SITE = arg('site', 'https://bosun.silachev.com/')

const failures = []
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`)
  if (!ok) failures.push(what)
}

async function get(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    return { res, text: await res.text() }
  } catch (error) {
    return { res: null, text: '', error }
  }
}

// The app: its shell, every script and stylesheet it links, the manifest and the headers.
const app = await get(APP)
check(app.res?.ok === true, `app ${APP} answers 200`)
if (app.res?.ok) {
  check(app.text.includes('<title>Bosun'), 'app shell has the Bosun title')
  check(app.res.headers.get('x-robots-tag') === 'noindex', 'app sends X-Robots-Tag: noindex')
  check(
    Boolean(app.res.headers.get('content-security-policy')),
    'app sends a Content-Security-Policy',
  )
  const assets = [...app.text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  check(assets.length > 0, 'app shell links its build assets')
  for (const path of assets) {
    const res = await fetch(new URL(path, APP)).catch(() => null)
    check(res?.ok === true, `app asset ${path}`)
  }
  const manifest = await fetch(new URL('/manifest.webmanifest', APP)).catch(() => null)
  check(manifest?.ok === true, 'app serves its manifest')
}

// The landing page: every language, and its link to the app.
for (const lang of ['', 'es/', 'de/', 'ru/', 'sr/']) {
  const page = await get(new URL(lang, SITE).href)
  check(page.res?.ok === true, `landing page ${SITE}${lang} answers 200`)
  if (page.res?.ok)
    check(
      page.text.includes('app.bosun.silachev.com'),
      `landing page ${lang || 'en'} links the app`,
    )
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nLive: both addresses serve the current build.')
