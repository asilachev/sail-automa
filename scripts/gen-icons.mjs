// Renders the icon set into public/ from the K3 helm (src/ui/assets/art/helm.svg).
//
//   npm run icons
//
// It follows design board "05 · Icon and favicons": the favicons are the bare helm (16 px uses the
// simpler wooden symbol), the home-screen icons put the helm at 74 % on the card-face tile
// (#50696A) with the sea contours at 13 %. The "any" icons keep the board's rounded tile; the
// apple-touch, 1024 and maskable icons are full squares, because the OS cuts its own mask, and the
// maskable helm stays inside the 80 % safe circle. The full set is the pwa layer's checklist.
//
// It drives the installed Google Chrome through playwright-core, as the e2e test does; set
// CHROME_PATH to use another Chrome or Chromium. The output is committed, so builds don't need it.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const art = (name) => readFile(`${root}src/ui/assets/art/${name}.svg`, 'utf8')
const out = `${root}public/`

const TILE = '#50696A' // design token: night card face (board 05's tile)
const MARK = 0.74 // the helm's share of the tile: 237 of 320 on board 05
const RADIUS = 22 / 96 // board 05's "icon-192 · any" tile: 22 px corners at 96 px

const helm = await art('helm')
const symHelm = await art('sym-helm')
const contours = await art('sea-contours')
const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

/** One icon as HTML: the bare mark, or the mark on the tile. */
function page({ size, mark = helm, tile = false, rounded = false, scale = tile ? MARK : 1 }) {
  const markPx = Math.round(size * scale)
  const tileCss = tile
    ? `background:url("${dataUri(contours)}") center/cover, ${TILE};` +
      `border-radius:${rounded ? Math.round(size * RADIUS) : 0}px;`
    : ''
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:transparent}
    .tile{position:relative;width:${size}px;height:${size}px;display:grid;place-items:center;overflow:hidden;${tileCss}}
    .tile::before{content:"";position:absolute;inset:0;background:${TILE};opacity:${tile ? 0.87 : 0}}
    img{position:relative;width:${markPx}px;height:${markPx}px;object-fit:contain}
  </style></head><body><div class="tile"><img src="${dataUri(mark)}" alt=""></div></body></html>`
}

// [file, options]. Contours at 13 %: the tile colour is laid over them at 87 % (::before).
const icons = [
  ['favicon-16x16.png', { size: 16, mark: symHelm }],
  ['favicon-32x32.png', { size: 32 }],
  ['favicon-48x48.png', { size: 48 }],
  ['apple-touch-icon.png', { size: 180, tile: true }],
  ['pwa-192x192.png', { size: 192, tile: true, rounded: true }],
  ['pwa-512x512.png', { size: 512, tile: true, rounded: true }],
  ['pwa-1024x1024.png', { size: 1024, tile: true }],
  ['maskable-192x192.png', { size: 192, tile: true }],
  ['maskable-512x512.png', { size: 512, tile: true }],
]

/** An ICO file holding PNG images (supported by every browser since Windows Vista's format). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4) // colour planes
    header.writeUInt16LE(32, e + 6) // bits per pixel
    header.writeUInt32LE(png.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map(({ png }) => png)])
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
)
try {
  await mkdir(out, { recursive: true })
  const context = await browser.newContext({ deviceScaleFactor: 1 })
  const tab = await context.newPage()
  const pngs = {}
  for (const [file, options] of icons) {
    await tab.setViewportSize({ width: options.size, height: options.size })
    await tab.setContent(page(options))
    await tab.locator('img').evaluate((img) => img.decode())
    const png = await tab.locator('.tile').screenshot({ omitBackground: true })
    await writeFile(out + file, png)
    pngs[file] = png
    console.log(`public/${file}`)
  }
  await writeFile(
    `${out}favicon.ico`,
    ico([16, 32, 48].map((size) => ({ size, png: pngs[`favicon-${size}x${size}.png`] }))),
  )
  console.log('public/favicon.ico')
  // The SVG favicon is the helm itself: the browser scales it to any tab size.
  await writeFile(`${out}favicon.svg`, helm)
  console.log('public/favicon.svg')
} finally {
  await browser.close()
}
